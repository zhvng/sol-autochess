use anchor_lang::{prelude::*};
use std::collections::BTreeMap;

pub fn get_unit_map() -> BTreeMap<UnitType, UnitStats> {
    let mut units = BTreeMap::new();
    const TICKS_PER_SECOND: u16 = 5;
    units.insert(
        UnitType::Wolf,
        UnitStats {
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
        UnitStats {
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
        UnitStats {
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

#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, serde::Serialize, serde::Deserialize)]
pub struct UnitStats {
    pub movement_speed: u16,
    pub attack_duration: u16,
    pub attack_range: u16,
    pub attack_damage: u16,
    pub starting_health: u16,
    pub crit_chance: u8,
}

#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
    Mythic
}

pub fn get_baseline_unit_stats(unit_type: UnitType, rarity: Rarity) -> Option<UnitStats> {
    const TICKS_PER_SECOND: u16 = 5;
    match unit_type {
        UnitType::Wolf => Some(match rarity {
            Rarity::Common => UnitStats {
                movement_speed: 250 / TICKS_PER_SECOND, // per tick
                attack_duration: 4, // in ticks
                attack_range: 125,
                attack_damage: 15,
                starting_health: 100,
                crit_chance: 22, // out of 255
            },
            Rarity::Uncommon => UnitStats {
                movement_speed: 260 / TICKS_PER_SECOND, // per tick
                attack_duration: 4, // in ticks
                attack_range: 125,
                attack_damage: 16,
                starting_health: 105,
                crit_chance: 26, // out of 255
            }, 
            Rarity::Rare => UnitStats {
                movement_speed: 270 / TICKS_PER_SECOND, // per tick
                attack_duration: 4, // in ticks
                attack_range: 125,
                attack_damage: 18,
                starting_health: 110,
                crit_chance: 30, // out of 255
            },
            Rarity::Epic => UnitStats {
                movement_speed: 280 / TICKS_PER_SECOND, // per tick
                attack_duration: 4, // in ticks
                attack_range: 125,
                attack_damage: 19,
                starting_health: 115,
                crit_chance: 35, // out of 255
            },
            Rarity::Legendary => UnitStats {
                movement_speed: 290 / TICKS_PER_SECOND, // per tick
                attack_duration: 4, // in ticks
                attack_range: 125,
                attack_damage: 20,
                starting_health: 120,
                crit_chance: 37, // out of 255
            },
            Rarity::Mythic => UnitStats {
                movement_speed: 300 / TICKS_PER_SECOND, // per tick
                attack_duration: 3, // in ticks
                attack_range: 125,
                attack_damage: 21,
                starting_health: 125,
                crit_chance: 42, // out of 255
            },
        }),
        UnitType::Bull => Some(match rarity {
            Rarity::Common => UnitStats {
                movement_speed: 125 / TICKS_PER_SECOND, // per tick
                attack_duration: 7,
                attack_range: 150,
                attack_damage: 20,
                starting_health: 150,
                crit_chance: 15, // out of 255
            },
            Rarity::Uncommon => UnitStats {
                movement_speed: 125 / TICKS_PER_SECOND, // per tick
                attack_duration: 7, // in ticks
                attack_range: 155,
                attack_damage: 22,
                starting_health: 155,
                crit_chance: 17, // out of 255
            }, 
            Rarity::Rare => UnitStats {
                movement_speed: 125 / TICKS_PER_SECOND, // per tick
                attack_duration: 7, // in ticks
                attack_range: 155,
                attack_damage: 25,
                starting_health: 160,
                crit_chance: 17, // out of 255
            },
            Rarity::Epic => UnitStats {
                movement_speed: 125 / TICKS_PER_SECOND, // per tick
                attack_duration: 7, // in ticks
                attack_range: 155,
                attack_damage: 27,
                starting_health: 165,
                crit_chance: 17, // out of 255
            },
            Rarity::Legendary => UnitStats {
                movement_speed: 125 / TICKS_PER_SECOND, // per tick
                attack_duration: 7, // in ticks
                attack_range: 155,
                attack_damage: 29,
                starting_health: 170,
                crit_chance: 17, // out of 255
            },
            Rarity::Mythic => UnitStats {
                movement_speed: 125 / TICKS_PER_SECOND, // per tick
                attack_duration: 7, // in ticks
                attack_range: 155,
                attack_damage: 32,
                starting_health: 175,
                crit_chance: 17, // out of 255
            },
        }),
        UnitType::Bear => Some(match rarity {
            Rarity::Common => UnitStats {
                movement_speed: 75 / TICKS_PER_SECOND, // per tick
                attack_duration: 6,
                attack_range: 150,
                attack_damage: 8,
                starting_health: 230,
                crit_chance: 15, // out of 255
            },
            Rarity::Uncommon => UnitStats {
                movement_speed: 75 / TICKS_PER_SECOND, // per tick
                attack_duration: 6,
                attack_range: 150,
                attack_damage: 10,
                starting_health: 250,
                crit_chance: 15, // out of 255
            },
            Rarity::Rare => UnitStats {
                movement_speed: 75 / TICKS_PER_SECOND, // per tick
                attack_duration: 6,
                attack_range: 150,
                attack_damage: 12,
                starting_health: 270,
                crit_chance: 15, // out of 255
            },
            Rarity::Epic => UnitStats {
                movement_speed: 75 / TICKS_PER_SECOND, // per tick
                attack_duration: 6,
                attack_range: 150,
                attack_damage: 14,
                starting_health: 290,
                crit_chance: 15, // out of 255
            },
            Rarity::Legendary => UnitStats {
                movement_speed: 75 / TICKS_PER_SECOND, // per tick
                attack_duration: 6,
                attack_range: 150,
                attack_damage: 15,
                starting_health: 310,
                crit_chance: 15, // out of 255
            },
            Rarity::Mythic => UnitStats {
                movement_speed: 75 / TICKS_PER_SECOND, // per tick
                attack_duration: 6,
                attack_range: 150,
                attack_damage: 16,
                starting_health: 330,
                crit_chance: 15, // out of 255
            },
        }),
        _ => None
    }
}

/// unit "card" in a player's hand
#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, serde::Serialize, serde::Deserialize)]
pub struct Card {
    pub unit_type: UnitType,
    pub stats: UnitStats,
    pub rarity: Rarity,
    pub special_trait: Option<SpecialTrait>,
}

#[derive(Debug, Ord, Eq, PartialOrd, PartialEq, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum SpecialTrait {
    Assassin,
}
// pub struct AttackModifierArgs<'a> {
//     pub unit: &'a Unit<'a>,
//     pub entity: &'a Entity, 
//     pub entities: &'a Entities,
// }
