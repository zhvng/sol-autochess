use anchor_lang::{prelude::*};

use super::utils::Location;

pub fn get_unit_array() -> Vec<Unit> {
    vec! [
        Unit {
            movement_speed: 1,
            attack_duration: 2,
            attack_range: 1,
        }
    ]
}

pub enum AttackType {
    Melee,
    Ranged{speed: u16},
}
pub fn add(a: u64, b: u64) -> u64 {
    a + b
}

pub struct Unit {
    movement_speed: u16,
    attack_duration: u16,
    attack_range: u16,
}

pub trait UnitTrait {
    fn move_unit(&self, target: Location) -> bool;
    fn initiate_attack(&self, target: u16) -> bool;
    fn step(&self) -> u16;
}

pub struct UnitStats {
    movement_speed: u16,
    attack_duration: u16,
    attack_range: u16,
}