use anchor_lang::{prelude::*, solana_program::log::sol_log_compute_units};
use super::{utils::Location, actions::{Action, Actions}, units::{UnitType, UnitStats, Card, Rarity, SpecialTrait}};

use serde;

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone, serde::Serialize, serde::Deserialize)]
pub struct Entities {
    pub all: Vec<Entity>,
    pub counter: u16,
}
impl Entities {
    /// Create a piece but autofill the id
    pub fn create(&mut self, player: Controller, x: u16, y: u16, card: Card) -> u16 {
        let id = self.counter;
        self.create_with_id(id, player, x, y, card);
        self.counter += 1;
        return id;
    }

    pub fn create_with_id(&mut self, id: u16, player: Controller, x: u16, y: u16, card: Card) -> u16 {
        let unit_type = card.unit_type;
        let stats = &card.stats;
        let rarity = card.rarity;
        let special_trait = card.special_trait;
        self.all.push(Entity {
            id,
            owner: player,
            target: None,
            speed_multiplier: 100,
            position: Location{x, y},
            health: stats.starting_health,
            unit_type,
            state: EntityState::Idle,
            stats: Some(stats.clone()),
            rarity: Some(rarity),
            special_trait,
        });
        return id;
    }

    pub fn remove_by_id(&mut self, id: u16) {
        let index = self.get_index_by_id(id).unwrap();
        self.all.remove(index);
    }

    /// place a hidden piece. on reveal, call reveal_hidden
    pub fn create_hidden(&mut self, player: Controller, x: u16, y: u16, hand_position: u8) -> u16 {
        let id = self.counter;
        self.all.push(Entity {
            id,
            owner: player,
            target: None,
            speed_multiplier: 100,
            position: Location{x, y},
            health: 0,
            unit_type: UnitType::Hidden{hand_position},
            state: EntityState::Idle,
            stats: None,
            rarity: None,
            special_trait: None,
        });
        self.counter += 1;
        return id;
    }
    /// Given a hand of unit types, reveal all hidden pieces on the board for a given player
    pub fn reveal_all_hidden(&mut self, player: Controller, hand: &Vec<Card>) {
        for entity in &mut self.all {
            if entity.owner == player {
                match entity.unit_type {
                    UnitType::Hidden{hand_position} => {
                        let card = &hand[hand_position as usize];
                        let unit_type = card.unit_type;
                        let stats = &card.stats;
                        let rarity = card.rarity;
                        let special_trait = card.special_trait;

                        entity.unit_type = unit_type;
                        entity.health = stats.starting_health;
                        entity.stats = Some(stats.clone());
                        entity.rarity = Some(rarity);
                        entity.special_trait = special_trait;
                    },
                    _ => {
                        panic!("shouldn't reach here bc all pieces should be hidden");
                    }
                }
            }
        }
    }

    pub fn get_index_by_id(&self, id: u16) -> Option<usize> {
        for (i, entity) in &mut self.all.iter().enumerate() {
            if entity.id == id {
                return Some(i);
            }
        }
        return None;
    }

    pub fn get_by_id_mut(&mut self, id: u16) -> Option<&mut Entity> {
        for entity in &mut self.all {
            if entity.id == id {
                return Some(entity);
            }
        }
        None
    }
    pub fn get_by_id(&self, id: u16) -> Option<&Entity> {
        for entity in &self.all {
            if entity.id == id {
                return Some(entity);
            }
        }
        None
    }

    pub fn count_for_controller(&self, controller: Controller) -> u16 {
        let mut count: u16 = 0;
        for entity in &self.all {
            if entity.owner == controller {
                count += 1;
            }
        }
        count
    }

    /// Find closest entity to a point. With a given owner and within a given range. If no such units exist return none
    pub fn find_closest_entity_in_range(&self, position: &Location, range: u16, owner: Controller ) -> Option<EntityResult> {
        let mut min_distance: u16 = u16::MAX;
        let mut closest_enemy: Option<EntityResult> = None;
        for other in &self.all {
            if other.owner == owner {
                let distance = position.distance(&other.position);
                if distance < min_distance && distance <= range {
                    min_distance = distance;
                    closest_enemy = Some(EntityResult{
                        entity: &other,
                        distance,
                    });
                    sol_log_compute_units();
                }
            }
        }
        closest_enemy
    }
    pub fn find_closest_entity(&self, position: &Location, owner: Controller) -> Option<EntityResult> {
        self.find_closest_entity_in_range(&position, u16::MAX, owner)
    }
    /// Get all entities in a range from a given point
    pub fn find_all_entities(&self, position: &Location, range: u16, owner: Controller) -> Vec<&Entity> {
        let mut entities: Vec<&Entity> = Vec::new();
        for other in &self.all {
            if other.owner == owner {
                let distance = position.distance(&other.position);
                if distance <= range {
                    entities.push(other);
                }
            }
        }
        entities
    }
}
#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone, serde::Serialize, serde::Deserialize)]
pub struct Entity {
    pub id: u16,
    /// owner of the piece
    pub owner: Controller,

    /// id of the focused target
    pub target: Option<u16>,

    /// Speed multiplier where 100 = 1x
    pub speed_multiplier: u16,
    pub position: Location, // 800 x 800
    pub health: u16,
    /// Type of unit this is
    pub unit_type: UnitType, 
    pub state: EntityState,

    pub stats: Option<UnitStats>,
    pub rarity: Option<Rarity>,
    pub special_trait: Option<SpecialTrait>,
}
impl Entity {
    pub fn walk_or_aa(&self, actions: &mut Actions, all_entities: &Entities) {
        let enemy = if self.owner == Controller::Initializer {
            Controller::Opponent
        } else {
            Controller::Initializer
        };
        let target_entity = match self.target {
            Some(id) => {
                let entity = all_entities.get_by_id(id).unwrap();
                if entity.state == EntityState::Dead {
                    actions.add(self.id, Action::Target { target_id: None });
                    None
                } else {
                    Some(EntityResult {
                        entity: &entity,
                        distance: self.position.distance(&entity.position),
                    })
                }
            },
            None => {
                all_entities.find_closest_entity(&self.position, enemy)
            }
        };
        match target_entity {
            Some(result) => {
                let stats = self.stats.as_ref().unwrap();
                let aa_range: u16 = stats.attack_range;
                let movement_speed: u16 = stats.movement_speed;
                let attack_duration: u16 = stats.attack_duration;

                if result.distance <= aa_range {
                    // ATTACK
                    actions.add(self.id, Action::EntityStateChange { state: EntityState::Attack{progress: 0, attack_on: attack_duration, target_id:result.entity.id}});
                } else {
                    let move_to = self.position.move_towards(&result.entity.position, result.distance, movement_speed);
                    actions.add(self.id, Action::EntityStateChange { state: EntityState::Moving{to: move_to} });
                    actions.add(self.id, Action::Move{to: move_to});
                }

                if self.target == None {
                    actions.add(self.id, Action::Target { target_id: Some(result.entity.id) });
                }
            },
            None => {
                // No target for this turn, do nothing
                actions.add(self.id, Action::EntityStateChange { state: EntityState::Idle });
            }
        }
        sol_log_compute_units();
    }

    pub fn assassin_hop(&self, actions: &mut Actions) {
        // move to back row of board
        let move_to = if self.owner == Controller::Initializer {
            let to = Location {
                x: self.position.x,
                y: 800,
            };
            actions.add(self.id, Action::Move { to });
            to
        } else {
            let to = Location {
                x: self.position.x,
                y: 0,
            };
            actions.add(self.id, Action::Move { to }); 
            to
        };
        actions.add(self.id, Action::EntityStateChange { state: EntityState::Moving{to: move_to} });
    }
}

#[derive(Debug, PartialEq, Clone, AnchorSerialize, AnchorDeserialize, Copy, serde::Serialize, serde::Deserialize)]
pub enum EntityState {
    Idle,
    Moving{to: Location},
    Dead,
    Attack{progress: u16, attack_on: u16, target_id: u16},
    Ability{progress: u16, cast_on: u16, release_on: u16},
    Ult{progress: u16, cast_on: u16, release_on: u16},
}
/// Enum denoting owner of an entity
#[derive(Debug, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum Controller {
    Opponent = 0,
    Initializer = 1,
    Contract = 2,
    Graveyard = 3,
}

#[derive(Debug, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub struct EntityResult<'a> {
    pub entity: &'a Entity,
    pub distance: u16,
}

impl Default for EntityState {
    fn default() -> Self { EntityState::Idle }
}
impl Default for Controller {
    fn default() -> Self { Controller::Contract }
}
