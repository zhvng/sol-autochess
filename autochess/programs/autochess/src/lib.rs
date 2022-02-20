pub mod state;

use anchor_lang::{prelude::*};
use state::game::Game;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod autochess {

    use crate::state::{game::{validate_reveal}, entities::Controller};

    use super::*;
    pub fn create_game(ctx: Context<CreateGame>, commitment_1: [u8; 32], commitment_2: [u8; 32]) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.initialize_default();
        game.initializer = *ctx.accounts.initializer.key;
        game.i_commitment_1 = commitment_1;
        game.i_commitment_2 = commitment_2;
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>, commitment_1: [u8; 32], commitment_2: [u8; 32]) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.opponent = *ctx.accounts.invoker.key;
        game.o_commitment_1 = commitment_1;
        game.o_commitment_2 = commitment_2;
        game.state = 1;
        Ok(())
    }
    // let hash = hash(b"asdf");
    // if Hash::new_from_array(commitment_1) != hash {
    //     return Err(ErrorCode::Hello.into());
    // }

    pub fn reveal_first(ctx: Context<RevealFirst>, reveal_1: [u8; 32], secret: [u8; 32] ) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let invoker_is_initializer = game.initializer == *ctx.accounts.invoker.key;
        msg!("{:?}", game.reveal_1);
        msg!("{:?}", reveal_1);
        
        if invoker_is_initializer && !game.i_has_revealed {
            if !validate_reveal(&game.i_commitment_1, &reveal_1, &secret) {
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
        } else if !invoker_is_initializer && !game.o_has_revealed {
            if !validate_reveal(&game.o_commitment_1, &reveal_1, &secret) {
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
        } else {
            return Err(ErrorCode::RevealError.into());
        }

        if game.i_has_revealed && game.o_has_revealed {
            game.state = 2;
        }
        Ok(())
    }

    pub fn place_piece(ctx: Context<PlacePiece>, x: u16, y: u16) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        let player_type = if game.initializer == *ctx.accounts.invoker.key {
            Controller::Initializer
        } else {
            Controller::Opponent
        };

        let placed = game.place_piece(player_type, x, y, 1);
        if placed == false {
            return Err(ErrorCode::Hello.into());
        }
        Ok(())
    }

    pub fn crank_game(ctx: Context<CrankGame>) -> ProgramResult {
        let game = &mut ctx.accounts.game;
        game.step();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        seeds = [initializer.key().as_ref(), b"Game"],
        bump,
        space = 9000,
        payer = initializer, owner = *program_id,
    )]
    game: Account<'info, Game>,
    initializer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        constraint = game.state == 0 && game.initializer != *invoker.key,
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealFirst<'info> {
    #[account(
        mut,
        constraint = game.state == 1 &&
            (game.initializer == *invoker.key || game.opponent == *invoker.key),
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlacePiece<'info> {
    #[account(
        mut,
        constraint = game.state == 2 &&
            (game.initializer == *invoker.key || game.opponent == *invoker.key),
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}

#[derive(Accounts)]
pub struct CrankGame<'info> {
    #[account(
        mut,
        constraint = game.state == 2 &&
            (game.initializer == *invoker.key || game.opponent == *invoker.key),
    )]
    game: Account<'info, Game>,
    invoker: Signer<'info>,
}


#[error]
pub enum ErrorCode {
    #[msg("This is an error message clients will automatically display")]
    Hello,
    #[msg("Error revealing commitment")]
    RevealError,
}