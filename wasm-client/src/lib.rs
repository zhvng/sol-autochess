extern crate autochess;
mod utils;

use wasm_bindgen::prelude::*;
use autochess::state::units;
// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, wasm-client!");
}

#[wasm_bindgen]
pub fn add(a: u64, b: u64) -> u64 {
    units::add(a, b)
}
