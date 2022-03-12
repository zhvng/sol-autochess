pub mod state;

use anchor_lang::{prelude::*};
use state::game::Game;
use state::units::UnitType;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod autochess {

    use anchor_lang::solana_program::log::sol_log_compute_units;
    use state::units;

    use crate::state::{game::{validate_reveal, WinCondition, draw_hand}, entities::Controller, units::UnitType};

    use super::*;

    /// initialize a game account. It's a PDA based on the provided game id.
    /// Commitments are provided for to hide info until its reveal later.
    /// Send a burner wallet for fees for a smoother ux
    /// Set state to 0
    pub fn create_game(ctx: Context<CreateGame>, game_id: String, burner_wallet: [u8; 32], wager: u64, commitment_1: [u8; 32], commitment_2: [u8; 32]) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.initialize_default();
        game.initializer = *ctx.accounts.initializer.key;
        game.wager = wager;
        game.i_commitment_1 = Some(commitment_1);
        game.i_commitment_2 = Some(commitment_2);

        game.i_burner = Pubkey::new_from_array(burner_wallet);

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

    /// state = 0. Opponent joins game by passing in pda and enough sol to cover wager, as well as commitments
    /// Change state to 1.
    pub fn join_game(ctx: Context<JoinGame>, burner_wallet: [u8; 32], commitment_1: [u8; 32], commitment_2: [u8; 32]) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.opponent = *ctx.accounts.invoker.key;
        game.o_commitment_1 = Some(commitment_1);
        game.o_commitment_2 = Some(commitment_2);

        game.o_burner = Pubkey::new_from_array(burner_wallet);

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
    /// When both players reveal, state is changed to 2.
    pub fn reveal_first(ctx: Context<RevealFirst>, reveal_1: [u8; 32], secret: [u8; 32] ) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let invoker_is_initializer = game.i_burner == *ctx.accounts.invoker.key;
        msg!("{:?}", game.reveal_1);
        msg!("{:?}", reveal_1);
        
        // Validate reveal
        if invoker_is_initializer && !game.i_has_revealed {
            if !validate_reveal(&game.i_commitment_1.unwrap(), &reveal_1, &secret) {
                return Err(ErrorCode::RevealError.into());
            }
            game.i_has_revealed = true;
            game.i_commitment_1 = None; // save memory
        } else if !invoker_is_initializer && !game.o_has_revealed {
            if !validate_reveal(&game.o_commitment_1.unwrap(), &reveal_1, &secret) {
                return Err(ErrorCode::RevealError.into());
            }
            game.o_has_revealed = true;
            game.o_commitment_1 = None; // save memory
        } else {
            return Err(ErrorCode::RevealError.into());
        }

        // store reveal
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

        // Update state if finished
        if game.i_has_revealed && game.o_has_revealed {
            game.state = 2;
            game.i_has_revealed = false;
            game.o_has_revealed = false;

            // (todo) A 2 minute (+ a few seconds) timer is started. Once this timer is up, disable piece placement so its safe to reveal.
            let timer: i64 = 60 * 2 + 5;
            game.piece_timer = Some(ctx.accounts.clock.unix_timestamp + timer);
        }
        Ok(())
    }

    /// state = 2. Place a piece without revealing its type. Reveal its position in your hand.
    /// When timer expires, you cannot place anymore pieces.
    pub fn place_piece_hidden(ctx: Context<PlacePiece>, grid_x: u16, grid_y: u16, hand_position: u8) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let player_type = game.get_player_type(*ctx.accounts.invoker.key);

        // if timer is expired, error
        if ctx.accounts.clock.unix_timestamp > game.piece_timer.unwrap() {
            return Err(ErrorCode::TimeError.into());
        }

        // place piece. fail if fails
        let placed = game.place_piece_hidden(player_type, grid_x, grid_y, hand_position);
        if placed == None {
            return Err(ErrorCode::Hello.into());
        }
        Ok(())
    }
    /// state = 2. Each player reveals their second commitments. This also reveals hidden pieces in game state.
    /// State is advanced to 3 once both are revealed.
    pub fn reveal_second(ctx: Context<RevealSecond>, reveal_2: [u8; 32], secret: [u8; 32] ) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let player_type = game.get_player_type(*ctx.accounts.invoker.key);

        if player_type == Controller::Initializer && !game.i_has_revealed {
            if !validate_reveal(&game.i_commitment_2.unwrap(), &reveal_2, &secret) {
                return Err(ErrorCode::RevealError.into());
            }
            game.i_has_revealed = true;
            game.i_commitment_2 = None; // save memory
        } else if player_type == Controller::Opponent && !game.o_has_revealed {
            if !validate_reveal(&game.o_commitment_2.unwrap(), &reveal_2, &secret) {
                return Err(ErrorCode::RevealError.into());
            }
            game.o_has_revealed = true;
            game.o_commitment_2 = None; // save memory
        } else {
            return Err(ErrorCode::RevealError.into());
        }
        // Combine reveals (xor)
        match &mut game.reveal_2 {
            None => {
                game.reveal_2 = Some(reveal_2);
            },
            Some(stored_reveal) => {
                stored_reveal.iter_mut()
                    .zip(reveal_2.iter())
                    .for_each(|(x1, x2)| *x1 ^= *x2);
                game.reveal_2 = Some(*stored_reveal);
            }   
        }

        game.reveal_hidden_pieces(player_type, &reveal_2);

        if game.i_has_revealed && game.o_has_revealed {
            game.state = 3;
            game.i_has_revealed = false;
            game.o_has_revealed = false;
        }
        Ok(())
    }

    /// state = 3. Once second reveal happens, pieces are locked in and game begins.
    /// move forward by given number of steps
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

    /// state = 3. If a win condition is reached, claim it.
    pub fn claim_victory(ctx: Context<ClaimVictory>) -> ProgramResult {
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
        constraint = game.i_burner == *invoker.key || game.o_burner == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct PlacePiece<'info> {
    #[account(
        mut,
        constraint = game.state == 2,
        constraint = game.i_burner == *invoker.key || game.o_burner == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct RevealSecond<'info> {
    #[account(
        mut,
        constraint = game.state == 2,
        constraint = game.i_burner == *invoker.key || game.o_burner == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct CrankGame<'info> {
    #[account(
        mut,
        constraint = game.state == 3,
        constraint = game.i_burner == *invoker.key || game.o_burner == *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimVictory<'info> {
    #[account(
        mut,
        constraint = game.state == 3,
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
    #[msg("Time Limit Exceeded")]
    TimeError,
    #[msg("Error revealing commitment")]
    RevealError,
    #[msg("Error claiming victory")]
    ClaimError
}