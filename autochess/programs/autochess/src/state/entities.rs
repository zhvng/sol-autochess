use anchor_lang::prelude::*;
use super::utils::Location;


#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Entities {
    pub all: Vec<Entity>,
    pub counter: u16,
}

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub struct Entity {
    pub id: u16,
    /// owner of the piece
    pub owner: Controller,

    /// Speed multiplier where 100 = 1x
    pub speed_multiplier: u16,
    pub position: Location, // 800 x 800
    /// Type of unit this is
    /// 0 - wolf (melee)
    /// 1 - spider (ranged)
    pub unit_type: u16, 
    pub state: EntityState,
}

#[derive(Debug, PartialEq, Clone, AnchorSerialize, AnchorDeserialize, Copy)]
pub enum EntityState {
    Idle,
    Moving{to: Location},
    Dead,
    Attack{progress: u16, attack_on: u16},
    Ability{progress: u16, cast_on: u16, release_on: u16},
    Ult{progress: u16, cast_on: u16, release_on: u16},
}
/// Enum denoting owner of an entity
#[derive(Debug, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub enum Controller {
    Opponent,
    Initializer,
    Contract,
}

#[derive(Debug, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub struct EntityResult<'a> {
    pub entity: &'a Entity,
    pub distance: u16,
}

impl Entity {
    pub fn walk_or_aa(&mut self, all_entities: &Entities) {
        let enemy = if self.owner == Controller::Initializer {
            Controller::Opponent
        } else {
            Controller::Initializer
        };
        let closest_entity = all_entities.find_closest_entity(&self.position, enemy);
        msg!("{:#?}", closest_entity);
        match closest_entity {
            Some(result) => {
                let aa_range: u16 = 200;
                let movement_speed: u16 = 10;

                if result.distance <= aa_range {
                    // ATTACK
                    self.state = EntityState::Attack{progress: 0, attack_on: 10};
                } else {
                    let target = Location {
                        x: (self.position.x as f64 + (result.entity.position.x as f64 - self.position.x as f64) /result.distance as f64 * movement_speed as f64) as u16,
                        y: (self.position.y as f64 + (result.entity.position.y as f64 - self.position.y as f64) /result.distance as f64 * movement_speed as f64) as u16,
                    };
                    self.state = EntityState::Moving{to: target}
                }
            },
            None => {
                // GAME SHOULD BE WON
            }
        }
    }
}

impl Entities {
    pub fn create(&mut self, player: Controller, x: u16, y: u16, unit_type: u16) {
        self.all.push(Entity {
            id: self.counter,
            owner: player,
            speed_multiplier: 100,
            position: Location{x, y},
            unit_type,
            state: EntityState::Idle,
        });
        self.counter += 1;
    }
    pub fn get_by_id(&self, id: u16) -> Option<&Entity> {
        for entity in &self.all {
            if entity.id == id {
                return Some(entity);
            }
        }
        None
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
impl Default for EntityState {
    fn default() -> Self { EntityState::Idle }
}
impl Default for Controller {
    fn default() -> Self { Controller::Contract }
}
