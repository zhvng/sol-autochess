use anchor_lang::{prelude::*};
use std::collections::BTreeMap;

pub fn get_unit_map() -> BTreeMap<UnitType, Unit> {
    let mut units = BTreeMap::new();
    const TICKS_PER_SECOND: u16 = 5;
    units.insert(
        UnitType::Wolf,
        Unit {
            movement_speed: 200 / TICKS_PER_SECOND, // per tick
            attack_duration: 4, // in ticks
            attack_range: 125,
            attack_damage: 15,
            starting_health: 100,
            crit_chance: 50, // out of 255
        },
    );
    units.insert(
        UnitType::Bear,
        Unit {
            movement_speed: 75 / TICKS_PER_SECOND, // per tick
            attack_duration: 6,
            attack_range: 150,
            attack_damage: 10,
            starting_health: 250,
            crit_chance: 20, // out of 255
        },
    );
    units.insert(
        UnitType::Bull,
        Unit {
            movement_speed: 125 / TICKS_PER_SECOND, // per tick
            attack_duration: 7,
            attack_range: 150,
            attack_damage: 25,
            starting_health: 150,
            crit_chance: 20, // out of 255
        },
    );
    units
}

#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum UnitType {
    Wolf,
    Bull,
    Bear,
    Hidden{hand_position: u8}, // 0 -> n-1 where n is size of hand
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

#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct Unit {
    pub movement_speed: u16,
    pub attack_duration: u16,
    pub attack_range: u16,
    pub attack_damage: u16,
    pub starting_health: u16,
    pub crit_chance: u8,
}

// pub struct AttackModifierArgs<'a> {
//     pub unit: &'a Unit<'a>,
//     pub entity: &'a Entity, 
//     pub entities: &'a Entities,
// }
