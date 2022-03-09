use std::{collections::BTreeMap, fs::OpenOptions};

use anchor_lang::{solana_program::{hash::{Hash, hash, extend_and_hash}, loader_instruction::LoaderInstruction, log::sol_log_compute_units}, prelude::*};

use crate::state::entities;

use super::{utils, entities::{Entity, Entities}, units};

use serde;

#[account]
#[derive(Default, serde::Serialize, serde::Deserialize)]
pub struct Game {
    /// Game state:
    /// 0 - Initialized with 2 commitments. Waiting for opponent to join room and submit their commitments.
    /// 1 - Opponent has joined the room. Waiting for reveal.
    /// 2 - Both parties have revealed their first commitment. Use to shuffle deck. Players draw cards according to unrevealed commitment. Waiting for piece placement.
    /// 3 - Players have placed their pieces. Waiting for 2nd commitment reveal. 2nd commitment verifies hand & also serves as entropy for the game.
    /// 4 - Game is in progress. Waiting for crank request.
    /// continue 4 until game finishes or time limit is reached.
    /// 5 - Game is finished. Waiting for winning player to withdraw funds.
    pub state: u8,
    pub wager: u64,
    pub win_condition: WinCondition,

    pub initializer: Pubkey,
    pub opponent: Pubkey,

    pub i_commitment_1: Option<[u8; 32]>,
    pub i_commitment_2: Option<[u8; 32]>,
    pub o_commitment_1: Option<[u8; 32]>,
    pub o_commitment_2: Option<[u8; 32]>,

    pub i_has_revealed: bool,
    pub o_has_revealed: bool,
    pub reveal_1: Option<[u8; 32]>,
    pub reveal_2: Option<[u8; 32]>,

    pub entities: Entities,

    pub tick: u32,
    pub random_calls: u16,
}

/// When a unit needs to modify another unit, add an Apply into a vector and modify at the end of the game loop
/// This removes the need for two mutable borrows
enum Apply {
    Damage {
        amount: u16,
        target_id: u16,
    }
}

#[derive(Debug, PartialEq, Clone, AnchorSerialize, AnchorDeserialize, Copy, serde::Serialize, serde::Deserialize)]
pub enum WinCondition {
    Initializer,
    Opponent,
    Tie,
    InProgress,
}

impl Default for WinCondition {
    fn default() -> Self { WinCondition::InProgress }
}

impl Game {
    /// initialize state for the client wasm
    pub fn new_client() -> Game {
        let mut game = Game { 
            ..Default::default()
        };
        game.initialize_default();
        game
    }

    pub fn initialize_default(&mut self) {
        self.i_has_revealed = false;
        self.o_has_revealed = false;
        self.state = 0;
        self.tick = 0;
        self.random_calls = 0;
        self.entities = entities::Entities {
            all: Vec::new(),
            counter: 0,
        };
        self.win_condition = WinCondition::InProgress;
    }

    /// Place piece in a grid, where (0,0) is the bottom left grid from the initalizers pov, and (7,7) is the top right
    pub fn place_piece(&mut self, player: entities::Controller, grid_x: u16, grid_y: u16, unit_type: units::UnitType) -> Option<u16> {
        msg!("{:?}", self.entities);

        let x = grid_x * 100 + 50;
        let y = grid_y * 100 + 50;

        // must place in bounds
        if x > 800 || y > 800 {
            return None;
        }
        // must place on your side
        match player {
            entities::Controller::Initializer => {
                if y > 300 {
                    return None;
                }
            },
            entities::Controller::Opponent => {
                if y < 500 {
                    return None;
                }
            },
            _other => {
                return None;
            }
        }

        let id = self.entities.create(player, x, y, unit_type);
        return Some(id);
    }

    /// Check if the game has been completed and update account with who won
    pub fn update_win_condition(&mut self) {
        let mut iAlive = 0;
        let mut oAlive = 0;
        for entity in &self.entities.all {
            if entity.state != entities::EntityState::Dead {
                match entity.owner {
                    entities::Controller::Initializer => {
                        iAlive += 1;
                    },
                    entities::Controller::Opponent => {
                        oAlive += 1;
                    },
                    _other => {}
                }
            }
        }
        if iAlive == 0 && oAlive == 0 {
            self.win_condition = WinCondition::Tie;
        } else if iAlive == 0 {
            self.win_condition = WinCondition::Opponent;
        } else if oAlive == 0 {
            self.win_condition = WinCondition::Initializer;
        } else {
            self.win_condition = WinCondition::InProgress;
        }
    }

    /// Retreive a random number derived from the second reveal
    fn get_random_u8(&mut self) -> u8 {
        if self.random_calls >= 32 {
            self.reveal_1 = Some(generate_new_randomness(&self.reveal_1.unwrap()));
            self.random_calls = 0;
        } 
        let randomness = self.reveal_1.unwrap();
        let random_index = (self.random_calls)as usize;
        self.random_calls = self.random_calls + 1;
        return randomness[random_index];
    }

    /// Run through one game step (every entity moves)
    pub fn step(&mut self, unit_map: &BTreeMap<units::UnitType, units::Unit>) {

        let mut actions: Vec<Apply>= Vec::new();
        // move and change entities themselves
        let all_entities = &self.entities.clone();
        for entity in &mut self.entities.all {
            if entity.owner == entities::Controller::Initializer || entity.owner == entities::Controller::Opponent {
                match entity.state {
                    entities::EntityState::Idle => {
                        entity.walk_or_aa(all_entities, unit_map);
                    },
                    entities::EntityState::Moving{to} => {
                        entity.position = to;
                        entity.walk_or_aa(all_entities, unit_map);
                    },
                    entities::EntityState::Attack{ref mut progress, attack_on, target_id} => {
                        *progress +=1;
                        if *progress == attack_on {
                            // atack
                            let unit = unit_map.get(&entity.unit_type).unwrap();
                            actions.push(Apply::Damage{amount: unit.attack_damage, target_id});
                            entity.state = entities::EntityState::Idle;
                        }
                    },
                    _other=>{}
                }
            }
        }

        // apply inflicted effects
        for action in actions {
            match action {
                Apply::Damage{amount, target_id} => {
                    match self.entities.get_by_id_mut(target_id) {
                        Some(u) => {
                            let new_health_option =  u.health.checked_sub(amount);
                            match new_health_option {
                                Some (new_health) => {
                                    u.health = new_health;
                                }
                                None => {
                                    u.health = 0;
                                    u.state = entities::EntityState::Dead;
                                    u.owner = entities::Controller::Graveyard;
                                }
                            }
                        },
                        None=>{}
                    }
                }
            }
        }
        self.tick = self.tick + 1;
    }
    
}

pub fn validate_reveal(stored_hash: &[u8; 32], reveal: &[u8; 32], secret: &[u8; 32]) -> bool {
    let hash = extend_and_hash(&Hash::new_from_array(*reveal), secret);
    if Hash::new_from_array(*stored_hash) != hash {
        return false;
    }
    return true;
}

pub fn generate_new_randomness(stored_hash: &[u8; 32]) -> [u8; 32] {
    hash(stored_hash).to_bytes()
}