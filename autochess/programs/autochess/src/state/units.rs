use anchor_lang::{prelude::*};
use std::collections::BTreeMap;

use super::utils::Location;

pub fn get_unit_map() -> BTreeMap<UnitType, Unit> {
    let mut units = BTreeMap::new();
    const TICKS_PER_SECOND: u16 = 5;
    units.insert(
        UnitType::Wolf,
        Unit {
            movement_speed: 200 / TICKS_PER_SECOND, // per tick
            attack_duration: 3, // in ticks
            attack_range: 100,
            attack_damage: 20,
            starting_health: 100,
        },
    );
    units.insert(
        UnitType::Bear,
        Unit {
            movement_speed: 75 / TICKS_PER_SECOND, // per tick
            attack_duration: 4,
            attack_range: 100,
            attack_damage: 10,
            starting_health: 200,
        },
    );
    units.insert(
        UnitType::Bull,
        Unit {
            movement_speed: 125 / TICKS_PER_SECOND, // per tick
            attack_duration: 7,
            attack_range: 150,
            attack_damage: 30,
            starting_health: 150,
        },
    );
    units
}

#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum UnitType {
    Wolf,
    Bull,
    Bear
}

impl Default for UnitType {
    fn default() -> UnitType {
        UnitType::Wolf
    }
}
pub enum AttackType {
    Melee,
    Ranged{speed: u16},
}
pub fn add(a: u64, b: u64) -> u64 {
    a + b
}

pub struct Unit {
    pub movement_speed: u16,
    pub attack_duration: u16,
    pub attack_range: u16,
    pub attack_damage: u16,
    pub starting_health: u16,
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