extern crate autochess;
mod utils;

use std::{collections::{BTreeMap}, convert::TryInto};

use wasm_bindgen::prelude::*;
use serde;

use autochess::state::{game::Game, game::draw_hand, units::{self, UnitType, UnitStats, Card}, entities::Controller};
// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct WasmState {
  game: Game,
  unit_map: BTreeMap<UnitType, UnitStats>
}

#[wasm_bindgen]
pub struct WasmLocation {
    x: u16,
    y: u16,
}

#[wasm_bindgen]
pub enum UnitTypeWasm {
    Wolf,
    Bear,
    Bull
}
impl UnitTypeWasm {
    fn convert(&self) -> UnitType {
        match self {
            UnitTypeWasm::Wolf => UnitType::Wolf,
            UnitTypeWasm::Bear => UnitType::Bear,
            UnitTypeWasm::Bull => UnitType::Bull,
        }
    }
}

#[wasm_bindgen]
#[derive(serde::Serialize, serde::Deserialize)]
pub enum ControllerWasm {
    Initializer,
    Opponent,
    Contract,
    Graveyard,
}
impl ControllerWasm {
    fn convert(&self) -> Controller {
        match self {
            ControllerWasm::Initializer => Controller::Initializer,
            ControllerWasm::Opponent => Controller::Opponent,
            ControllerWasm::Contract => Controller::Contract,
            ControllerWasm::Graveyard => Controller::Graveyard,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct HiddenUnit {
    x: u16, 
    y: u16, 
    is_initializer: bool, 
    hand_position: u8
}

#[wasm_bindgen]
impl WasmState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmState {
        utils::set_panic_hook();
        let game = Game::new_client();
        let unit_map = units::get_unit_map();

        WasmState {
            game,
            unit_map
        }
    }

    pub fn place_piece(&mut self, x:u16, y: u16, card_js: JsValue, player_type: ControllerWasm) -> u16 {
        let card: Card = card_js.into_serde::<Card>().unwrap();
        let placed = self.game.place_piece(player_type.convert(), x, y, card);
        return placed.unwrap();
    }

    pub fn place_piece_with_id(&mut self, id: u16, x:u16, y: u16, card_js: JsValue, player_type: ControllerWasm) -> u16 {
        let card: Card = card_js.into_serde::<Card>().unwrap();
        let placed = self.game.place_piece_with_id(id, player_type.convert(), x, y, card);
        return placed.unwrap();
    }

    pub fn step(&mut self) {
        self.game.step();
    }

    pub fn get_win_condition(&mut self) -> JsValue {
        self.game.update_win_condition();
        JsValue::from_serde(&self.game.win_condition).unwrap()
    }

    pub fn set_reveals(&mut self, reveal_1: &[u8], reveal_2: &[u8]) {
        self.game.reveal_1 = Some(reveal_1.try_into().expect("slice with incorrect length"));
        self.game.reveal_2 = Some(reveal_2.try_into().expect("slice with incorrect length"));
    }

    pub fn get_game(&mut self) -> JsValue {
        JsValue::from_serde(&self.game).unwrap()
    }

    pub fn get_entities(&mut self) -> JsValue {
        JsValue::from_serde(&self.game.entities).unwrap()
    }

    pub fn get_entity_by_id(&mut self, id: u16) -> JsValue {
        JsValue::from_serde(&self.game.entities.get_by_id_mut(id)).unwrap()
    }
}

#[wasm_bindgen]
pub fn draw_private_hand(finished_reveal_1: &[u8], player_reveal_2: &[u8]) -> JsValue {
    JsValue::from_serde(
        &draw_hand(finished_reveal_1.try_into().expect("slice with incorrect length"), 
            player_reveal_2.try_into().expect("slice with incorrect length")
        )).unwrap()
}