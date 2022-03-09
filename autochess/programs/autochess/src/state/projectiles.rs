use std::collections::btree_map::Range;

use anchor_lang::{prelude::*, solana_program::log::sol_log_compute_units};
use super::{utils::Location, units::{UnitType, Unit, self}, entities::Entity};


#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Projectiles {
    pub all: Vec<Projectile>,
}

impl Projectiles {
    pub fn get(&mut self) {
        for projectile in &mut self.all {
            match projectile {
                Projectile::RangedAttack(p) => p.step(),
                Projectile::Explosion(p) => p.step(),
                Projectile::None => {},
            }
        }
    }
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
    Explosion(Explosion),
}

pub trait ProjectileTrait {
    fn step(&mut self);
}

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct RangedAttack {
    pub position: Location,
    pub target_id: u16,
}

impl ProjectileTrait for RangedAttack {
    fn step(&mut self) {
        self.position.x = self.position.x + 1 ;
    }
}
#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct Explosion {
    pub position: Location,
    pub target_id: u16,
}
impl ProjectileTrait for Explosion {
    fn step(&mut self) {
        self.position.x = self.position.x + 21 ;
    }
}

#[derive(Debug, Default, AnchorDeserialize, AnchorSerialize, Clone)]
pub struct StaticTarget {
    pub position: Location,
    pub target: Location,
}

impl Default for Projectile {
    fn default() -> Projectile {
        Projectile::None
    }
}