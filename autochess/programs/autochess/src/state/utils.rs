use anchor_lang::{prelude::*};
use serde;

#[derive(Debug, PartialEq, Default, AnchorDeserialize, AnchorSerialize, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct Location {
    pub x: u16,
    pub y: u16,
}
impl Location {
    pub fn distance(&self, to: &Location) -> u16 {
        let squares = (to.x as i32 - self.x as i32).pow(2) + (to.y as i32 - self.y as i32).pow(2);
        (squares as f32).sqrt() as u16
    }

    pub fn move_towards(&self, to: &Location, precomputed_distance: u16, amount: u16) -> Location {
        Location {
            x: (self.x as f32 + (to.x as f32 - self.x as f32) /precomputed_distance as f32 * amount as f32) as u16,
            y: (self.y as f32 + (to.y as f32 - self.y as f32) /precomputed_distance as f32 * amount as f32) as u16,
        }
    }

    pub fn grid_distance(&self, to: &Location) -> u16 {
        let distance = to.x as i32 - self.x as i32 + to.y as i32 - self.y as i32;
        distance.abs() as u16
    }
}