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

    pub i_burner: Pubkey,
    pub o_burner: Pubkey,

    pub i_commitment_1: Option<[u8; 32]>,
    pub i_commitment_2: Option<[u8; 32]>,
    pub o_commitment_1: Option<[u8; 32]>,
    pub o_commitment_2: Option<[u8; 32]>,

    pub i_has_revealed: bool,
    pub o_has_revealed: bool,
    pub reveal_1: Option<[u8; 32]>,
    pub reveal_2: Option<[u8; 32]>,

    /// Option of timestamp at which placing new pieces is disabled.
    pub piece_timer: Option<i64>,
    /// Option of timestamp at which initializer is considered inactive. If the timestamp is reached, victory can be claimed by opponent
    pub i_inactivity_timer: Option<i64>,
    /// Option of timestamp at which opponent is considered inactive. If the timestamp is reached, victory can be claimed by initializer
    pub o_inactivity_timer: Option<i64>,

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

    /// Initialize the default state of the game struct. Called at create_game 
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

    /// Check if a piece can be placed at a given location by a player, according the following rules
    ///  - no two pieces share a location
    ///  - 3 pieces max for initializer/opponent 
    ///  - in bounds and on the right side
    /// n is how many additional pieces we want to place (1 for basic place, 0 for move)
    fn can_place(&self, player: entities::Controller, x: u16, y: u16, n: u16) -> bool {
        // must place in bounds
        if x > 800 || y > 800 {
            return false;
        }
        // must place on your side, and within your piece limits
        match player {
            entities::Controller::Initializer => {
                if y > 400 {
                    return false;
                }
                // For now, we're doing 3 vs 3. But subject to change
                if self.entities.count_for_controller(player) + n > 3 {
                    return false;
                }
            },
            entities::Controller::Opponent => {
                if y < 400 {
                    return false;
                }

                if self.entities.count_for_controller(player) + n > 3 {
                    return false;
                }
            },
            _other => {
                return false;
            }
        }

        // Check if it on top of another piece
        match self.entities.find_closest_entity(&utils::Location{x, y}, player) {
            Some(result) => {
                if result.distance < 25 {
                    // same grid location, fail it
                    return false;
                }
            },
            None =>{}
        }
        return true;
    }
    

    /// Place piece in a grid, where (0,0) is the bottom left grid from the initalizers pov, and (7,7) is the top right.
    /// For client use
    pub fn place_piece(&mut self, player: entities::Controller, grid_x: u16, grid_y: u16, unit_type: units::UnitType) -> Option<u16> {
        msg!("{:?}", self.entities);

        let x = grid_x * 100 + 50;
        let y = grid_y * 100 + 50;

        if self.can_place(player, x, y, 1) {
            let id = self.entities.create(player, x, y, unit_type);
            return Some(id);
        } else {
            return None;
        }
    }

    /// Place piece with a given id.
    /// For client use
    pub fn place_piece_with_id(&mut self, id: u16, player: entities::Controller, board_x: u16, board_y: u16, unit_type: units::UnitType) -> Option<u16> {
        msg!("{:?}", self.entities);

        let id = self.entities.create_with_id(id, player, board_x, board_y, unit_type);
        return Some(id);
    }

    /// Place a hidden piece piece in a grid, where (0,0) is the bottom left grid from the initalizers pov, and (7,7) is the top right.
    pub fn place_piece_hidden(&mut self, player: entities::Controller, grid_x: u16, grid_y: u16, hand_position: u8) -> Option<u16> {
        msg!("{:?}", self.entities);

        let x = grid_x * 100 + 50;
        let y = grid_y * 100 + 50;

        if self.can_place(player, x, y, 1) {
            // We can only place a hidden piece if we are a player
            if !(player == entities::Controller::Initializer || player == entities::Controller::Opponent) {
                return None;
            }
            // Hand position must be in bounds
            if hand_position >= 5 {
                return None;
            }
            // Hand position must be unique
            for entity in &mut self.entities.all {
                if entity.owner == player {
                    match entity.unit_type {
                        units::UnitType::Hidden{hand_position: hand_position_compare} => {
                            if hand_position_compare == hand_position {
                                return None;
                            }
                        }
                        _ =>{}
                    }
                }
            }
            // Finally, place the piece
            let id = self.entities.create_hidden(player, x, y, hand_position);
            return Some(id);
        } else {
            return None;
        }
    }
    /// Change the location of a hidden piece piece in a grid, where (0,0) is the bottom left grid from the initalizers pov, and (7,7) is the top right.
    pub fn move_piece_hidden(&mut self, player: entities::Controller, grid_x: u16, grid_y: u16, hand_position: u8) -> Option<u16> {
        msg!("{:?}", self.entities);

        let x = grid_x * 100 + 50;
        let y = grid_y * 100 + 50;

        if self.can_place(player, x, y, 0) {
            // We can only place a hidden piece if we are a player
            if !(player == entities::Controller::Initializer || player == entities::Controller::Opponent) {
                return None;
            }
            // Hand position must be in bounds
            if hand_position >= 5 {
                return None;
            }
            // Move if we find the hand position, otherwise fail
            for entity in &mut self.entities.all {
                if entity.owner == player {
                    match entity.unit_type {
                        units::UnitType::Hidden{hand_position: hand_position_compare} => {
                            if hand_position_compare == hand_position {
                                    // This piece has already been placed. Move it.
                                    entity.position = utils::Location{x, y};
                                    return Some(entity.id);
                            }
                        }
                        _ =>{}
                    }
                }
            }
            return None;
        } else {
            return None;
        }
    }
    /// Remove a hidden piece piece in the grid.
    pub fn remove_piece_hidden(&mut self, player: entities::Controller, hand_position: u8) -> Option<u16> {
        // We can only remove a hidden piece if we are a player
        if !(player == entities::Controller::Initializer || player == entities::Controller::Opponent) {
            return None;
        }
        // Hand position must be in bounds
        if hand_position >= 5 {
            return None;
        }
        // delete if we find the hand position, otherwise fail
        for entity in &self.entities.all.clone() {
            if entity.owner == player {
                match entity.unit_type {
                    units::UnitType::Hidden{hand_position: hand_position_compare} => {
                        if hand_position_compare == hand_position {
                            // This piece has already been placed. Move it.
                            self.entities.remove_by_id(entity.id);
                            return Some(entity.id);
                        }
                    }
                    _ =>{}
                }
            }
        }
        return None;
    }
    /// Using second reveal, simulate the player's draw. Then fill in identities of the hidden pieces.
    pub fn reveal_hidden_pieces(&mut self, player: entities::Controller, reveal_2: &[u8; 32]) {
        let hand = draw_hand(&self.reveal_1.unwrap(), reveal_2);
        self.entities.reveal_all_hidden(player, &hand);
    }

    /// Check if the game has been completed and update account with who won
    pub fn update_win_condition(&mut self) {
        let mut i_alive = 0;
        let mut o_alive = 0;
        for entity in &self.entities.all {
            if entity.state != entities::EntityState::Dead {
                match entity.owner {
                    entities::Controller::Initializer => {
                        i_alive += 1;
                    },
                    entities::Controller::Opponent => {
                        o_alive += 1;
                    },
                    _other => {}
                }
            }
        }
        if i_alive == 0 && o_alive == 0 {
            self.win_condition = WinCondition::Tie;
        } else if i_alive == 0 {
            self.win_condition = WinCondition::Opponent;
        } else if o_alive == 0 {
            self.win_condition = WinCondition::Initializer;
        } else {
            self.win_condition = WinCondition::InProgress;
        }
    }

    /// Retreive a random number derived from the second reveal
    fn get_random_u8(&mut self) -> u8 {
        if self.random_calls >= 32 {
            self.reveal_2 = Some(generate_new_randomness(&self.reveal_2.unwrap()));
            self.random_calls = 0;
        } 
        let randomness = self.reveal_2.unwrap();
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
    pub fn get_player_type(&self, burner_wallet: Pubkey) -> entities::Controller {
        if self.i_burner == burner_wallet {
            entities::Controller::Initializer
        } else {
            entities::Controller::Opponent
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

pub fn generate_new_randomness(stored_hash: &[u8; 32]) -> [u8; 32] {
    hash(stored_hash).to_bytes()
}

/// Draw from deck using randomness of first reveal and second reveal. Client side, but verified on chain.
pub fn draw_hand(randomness1: &[u8; 32], randomness2: &[u8; 32]) -> Vec<units::UnitType> {
    // XOR randomness together
    msg!("drawing");
    let mut reveal = randomness1.clone();
    reveal.iter_mut()
        .zip(randomness2.iter())
        .for_each(|(x1, x2)| *x1 ^= *x2);

    let mut result: Vec<units::UnitType> = Vec::new();
    let n = 5; //number of cards to draw

    let deck = [
        units::UnitType::Wolf,
        units::UnitType::Bear,
        units::UnitType::Bull
    ];
    for i in 0..n {
        let random = reveal[i  as usize]; //random u8 between 0 and 255
        let index = (random as f32 / 256.0 * 3.0) as u8; //between 0 and 2 inclusive
        result.push(deck[index as usize]);
    }
    result
}