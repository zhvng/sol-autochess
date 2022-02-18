use anchor_lang::{solana_program::hash::{Hash, extend_and_hash}, prelude::*};

use crate::state::units::UnitState;

#[account]
#[derive(Default)]
pub struct Game {
    pub initializer: Pubkey,
    pub opponent: Pubkey,
    /// Game state:
    /// 0 - Initialized with 2 commitments. Waiting for opponent to join room and submit their commitments.
    /// 1 - Opponent has joined the room. Waiting for reveal.
    /// 2 - Both parties have revealed their first commitment. Use to shuffle deck. Players draw cards according to unrevealed commitment. Waiting for piece placement.
    /// 3 - Players have placed their pieces. Waiting for 2nd commitment reveal. 2nd commitment verifies hand & also serves as entropy for the game.
    /// 4 - Game is in progress. Waiting for crank request.
    /// continue 4 until game finishes or time limit is reached.
    /// 5 - Game is finished. Waiting for winning player to withdraw funds.
    pub state: u8,

    pub i_commitment_1: [u8; 32],
    pub i_commitment_2: [u8; 32],
    pub o_commitment_1: [u8; 32],
    pub o_commitment_2: [u8; 32],

    pub i_has_revealed: bool,
    pub o_has_revealed: bool,
    pub reveal_1: Option<[u8; 32]>,
    pub reveal_2: Option<[u8; 32]>,

    pub i_pieces: Vec<Piece>,
    pub o_pieces: Vec<Piece>,
}

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Piece {
    /// Speed multiplier where 100 = 1x
    pub speed_multiplier: u16,
    pub x: u16, // 800 x 800
    pub y: u16,
    /// Type of unit this is
    /// 1 - wolf (melee)
    /// 2 - ape (ranged)
    pub unit_type: u16, 
    pub state: UnitState,
}
#[derive(Debug, PartialEq)]
pub enum Player {
    Opponent,
    Initializer,
}

impl Game {
    pub fn initialize_default(&mut self) {
        self.i_has_revealed = false;
        self.o_has_revealed = false;
        self.state = 0;
    }

    pub fn load_pieces(&self) {
        
    }

    pub fn place_piece(&mut self, player: Player, x: u16, y: u16, unit_type: u16) -> bool {
        let piece_array = if player == Player::Opponent {
            &mut self.o_pieces
        } else {
            &mut self.i_pieces
        };
        msg!("{:?}", piece_array);
        piece_array.push(Piece {
            speed_multiplier: 100,
            x,
            y,
            unit_type,
            state: UnitState::Idle,
        });
        msg!("{:?}", piece_array);
        return true;
    }

    pub fn step(&mut self) {
        for piece in &mut self.i_pieces {
            piece.x +=1;
            piece.y +=1 ;
        }
    }
}

pub fn validate_reveal(stored_hash: &[u8; 32], reveal: &[u8; 32], secret: &[u8; 32]) -> bool {
    let hash = extend_and_hash(&Hash::new_from_array(*reveal), secret);
    if Hash::new_from_array(*stored_hash) != hash {
        return false;
    }
    return true;
}