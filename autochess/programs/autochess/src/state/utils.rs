use anchor_lang::{prelude::*, solana_program::log::sol_log_compute_units};

#[derive(Debug, PartialEq, Default, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub struct Location {
    pub x: u16,
    pub y: u16,
}
impl Location {
    pub fn distance(&self, to: &Location) -> u16 {
        let squares = (to.x as i32 - self.x as i32).pow(2) + (to.y as i32 - self.y as i32).pow(2);
        (squares as f32).sqrt() as u16
    }

    pub fn grid_distance(&self, to: &Location) -> u16 {
        let distance = to.x as i32 - self.x as i32 + to.y as i32 - self.y as i32;
        distance.abs() as u16
    }
}