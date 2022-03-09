pub mod state;

use anchor_lang::{prelude::*};
use state::game::Game;
use state::units::UnitType;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod autochess {

    use std::sync::Arc;

    use anchor_lang::solana_program::log::sol_log_compute_units;
    use state::units;

    use crate::state::{game::{validate_reveal, WinCondition}, entities::Controller, units::UnitType};

    use super::*;

    /// initialize a game account. It's a PDA based on the provided game id.
    pub fn create_game(ctx: Context<CreateGame>, game_id: String, wager: u64, commitment_1: [u8; 32], commitment_2: [u8; 32]) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.initialize_default();
        game.initializer = *ctx.accounts.initializer.key;
        game.wager = wager;
        game.i_commitment_1 = Some(commitment_1);
        game.i_commitment_2 = Some(commitment_2);

        // Collect sol for the wager
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &game.initializer,
            &game.key(),
            wager,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.initializer.to_account_info(),
                game.to_account_info(),
            ],
        )
    }

    /// state = 0. Opponent joins game by passing in pda and enough sol to cover wager
    pub fn join_game(ctx: Context<JoinGame>, commitment_1: [u8; 32], commitment_2: [u8; 32]) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.opponent = *ctx.accounts.invoker.key;
        game.o_commitment_1 = Some(commitment_1);
        game.o_commitment_2 = Some(commitment_2);
        game.state = 1;

        // Collect sol for the wager
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &game.opponent,
            &game.key(),
            game.wager,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.invoker.to_account_info(),
                game.to_account_info(),
            ],
        )
    }

    /// state = 1. Each player reveals their commitments. They are xor'd to get a source of randomness for the drawing phase
    pub fn reveal_first(ctx: Context<RevealFirst>, reveal_1: [u8; 32], secret: [u8; 32] ) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let invoker_is_initializer = game.initializer == *ctx.accounts.invoker.key;
        msg!("{:?}", game.reveal_1);
        msg!("{:?}", reveal_1);
        
        if invoker_is_initializer && !game.i_has_revealed {
            if !validate_reveal(&game.i_commitment_1.unwrap(), &reveal_1, &secret) {
                return Err(ErrorCode::RevealError.into());
            }
            match &mut game.reveal_1 {
                None => {
                    game.reveal_1 = Some(reveal_1);
                },
                Some(stored_reveal) => {
                    stored_reveal.iter_mut()
                        .zip(reveal_1.iter())
                        .for_each(|(x1, x2)| *x1 ^= *x2);

                    game.reveal_1 = Some(*stored_reveal);
                }   
            }
            game.i_has_revealed = true;
            game.i_commitment_1 = None; // save memory
        } else if !invoker_is_initializer && !game.o_has_revealed {
            if !validate_reveal(&game.o_commitment_1.unwrap(), &reveal_1, &secret) {
                return Err(ErrorCode::RevealError.into());
            }
            match &mut game.reveal_1 {
                None => {
                    game.reveal_1 = Some(reveal_1);
                },
                Some(stored_reveal) => {
                    stored_reveal.iter_mut()
                        .zip(reveal_1.iter())
                        .for_each(|(x1, x2)| *x1 ^= *x2);
                    game.reveal_1 = Some(*stored_reveal);
                }   
            }
            game.o_has_revealed = true;
            game.o_commitment_1 = None; // save memory
        } else {
            return Err(ErrorCode::RevealError.into());
        }

        if game.i_has_revealed && game.o_has_revealed {
            game.state = 2;
        }
        Ok(())
    }

    /// state = 2.
    pub fn place_piece(ctx: Context<PlacePiece>, grid_x: u16, grid_y: u16, unit_type: UnitType) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let player_type = if game.initializer == *ctx.accounts.invoker.key {
            Controller::Initializer
        } else {
            Controller::Opponent
        };

        let placed = game.place_piece(player_type, grid_x, grid_y, unit_type);
        if placed == None {
            return Err(ErrorCode::Hello.into());
        }
        Ok(())
    }

    /// state = 4 (eventually)
    pub fn crank_game(ctx: Context<CrankGame>, steps: u8) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let unit_map = units::get_unit_map();
        for _ in 0..steps {
            sol_log_compute_units();
            game.step(&unit_map);
        }
        game.update_win_condition();
        Ok(())
    }

    /// state = 4 (eventually)
    pub fn claim_victory(ctx: Context<ClaimVictory>, game_id: String, nonce: u8) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let invoker = &ctx.accounts.invoker;
        game.update_win_condition();
        let needed_condition = if game.initializer == *ctx.accounts.invoker.key {
            WinCondition::Initializer
        } else {
            WinCondition::Opponent
        };
        if game.win_condition == needed_condition {
            // Send wager sol to player

            let amount = game.wager.checked_mul(2).ok_or(ProgramError::InvalidArgument)?;
            **invoker.try_borrow_mut_lamports()? = invoker
                .lamports()
                .checked_add(amount)
                .ok_or(ProgramError::InvalidArgument)?;
            **game.to_account_info().try_borrow_mut_lamports()? = game
                .to_account_info()
                .lamports()
                .checked_sub(amount)
                .ok_or(ProgramError::InvalidArgument)?;
            
        } else {
            return Err(ErrorCode::ClaimError.into());
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateGame<'info> {
    #[account(
        init,
        constraint = game_id.len() < 30,
        seeds = [game_id.as_bytes(), b"Game"],
        bump,
        space = 9000,
        payer = initializer, owner = *program_id,
    )]
    game: Account<'info, Game>,
    #[account(mut)]
    initializer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        constraint = game.state == 0,
        constraint = game.initializer != *invoker.key,
    )]
    game: Account<'info, Game>,
    #[account(mut)]
    invoker: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealFirst<'info> {
    #[account(
        mut,
        constraint = game.state == 1,
        constraint = game.initializer == *invoker.key || game.opponent == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlacePiece<'info> {
    #[account(
        mut,
        constraint = game.state == 2,
        constraint = game.initializer == *invoker.key || game.opponent == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct CrankGame<'info> {
    #[account(
        mut,
        constraint = game.state == 2,
        constraint = game.initializer == *invoker.key || game.opponent == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimVictory<'info> {
    #[account(
        mut,
        constraint = game.state == 2,
        constraint = game.initializer == *invoker.key || game.opponent == *invoker.key,
        constraint = game.initializer == *initializer.key,
        close = initializer,
    )]
    game: Account<'info, Game>,
    #[account(mut)]
    invoker: Signer<'info>,
    initializer: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}


#[error]
pub enum ErrorCode {
    #[msg("This is an error message clients will automatically display")]
    Hello,
    #[msg("Error revealing commitment")]
    RevealError,
    #[msg("Error claiming victory")]
    ClaimError
}