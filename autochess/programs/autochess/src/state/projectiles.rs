use std::collections::btree_map::Range;

use anchor_lang::{prelude::*, solana_program::log::sol_log_compute_units};
use super::{utils::Location, units::{UnitType, Unit, self}, entities::Entity};


#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Projectiles {
    pub all: Vec<Projectile>,
}

// #[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
// pub struct Projectile {
//     position: Location,
//     speed: u16,
//     target: Entity,
// }

#[derive(Debug, AnchorDeserialize, AnchorSerialize, Clone)]
pub enum Projectile {
    None,
    RangedAttack(RangedAttack),

}

pub trait ProjectileTrait {
    fn step(&mut self);
}

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct RangedAttack {
    pub position: Location,
    pub target_id: u16,
}

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct StaticTarget {
    pub position: Location,
    pub target: Location,
}

impl ProjectileTrait for RangedAttack {
    fn step(&mut self) {
        self.position.x = self.position.x + 1 ;
    }
}

impl Default for Projectile {
    fn default() -> Projectile {
        Projectile::None
    }
}