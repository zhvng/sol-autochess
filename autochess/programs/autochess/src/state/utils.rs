use anchor_lang::prelude::*;

#[derive(Debug, PartialEq, Default, AnchorDeserialize, AnchorSerialize, Clone, Copy)]
pub struct Location {
    pub x: u16,
    pub y: u16,
}
impl Location {
    pub fn distance(&self, to: &Location) -> u16 {
        (((to.x as f64 - self.x as f64).powf(2.0) + (to.y as f64 - self.y as f64).powf(2.0)) as f64).sqrt() as u16
    }
}