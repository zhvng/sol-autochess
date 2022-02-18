use anchor_lang::{prelude::*};

pub struct Location {
    x: u16,
    y: u16,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub enum UnitState {
    Idle,
    Moving,
    Attack{progress: u16, attack_on: u16},
    Ability{progress: u16, cast_on: u16, release_on: u16},
}
impl Default for UnitState {
    fn default() -> Self { UnitState::Idle }
}

pub enum AttackType {
    Melee,
    Ranged{speed: u16},
}
pub fn add(a: u64, b: u64) -> u64 {
    a + b
}

pub struct Unit {
    /// Speed multiplier where 100 = 1x
    pub speed_multiplier: u16,
    pub x: u16, // 800 x 800
    pub y: u16,

    pub state: UnitState,

    movement_speed: u16,
    attack_duration: u16,
    attack_range: u16,
}

pub trait UnitTrait {
    fn move_unit(&self, target: Location) -> bool;
    fn initiate_attack(&self, target: u16) -> bool;
    fn step(&self) -> u16;
    fn new() -> Unit;
}