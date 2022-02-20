use anchor_lang::{solana_program::{hash::{Hash, extend_and_hash}, loader_instruction::LoaderInstruction}, prelude::*};

use crate::state::entities;

use super::{utils, entities::{Entity, Entities}};

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

    pub entities: Entities,

    pub tick: u64,
}

impl Game {
    pub fn initialize_default(&mut self) {
        self.i_has_revealed = false;
        self.o_has_revealed = false;
        self.state = 0;
        self.tick = 0;
        self.entities = entities::Entities {
            all: Vec::new(),
            counter: 0,
        }
    }

    pub fn place_piece(&mut self, player: entities::Controller, x: u16, y: u16, unit_type: u16) -> bool {
        msg!("{:?}", self.entities);
        self.entities.create(player, x, y, unit_type);
        return true;
    }

    pub fn step(&mut self) {
        let all_entities = &self.entities.clone();
        for unit in &mut self.entities.all {
            if unit.owner != entities::Controller::Contract {
                match unit.state {
                    entities::EntityState::Idle => {
                        unit.walk_or_aa(all_entities);
                    },
                    entities::EntityState::Moving{to} => {
                        unit.position = to;
                        unit.walk_or_aa(all_entities);
                    },
                    other=>{}
                }
            }
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