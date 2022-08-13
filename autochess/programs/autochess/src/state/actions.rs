use std::{collections::BTreeMap};

use super::{entities::{EntityState}, utils::Location};

pub struct Actions {
    pub all: BTreeMap<u16, Vec<Action>>, //map from id to a vector of actions
}

impl Actions {
    pub fn new() -> Self {
        Actions {
            all: BTreeMap::new(),
        }
    }

    pub fn get_actions_by_id(&self, id: &u16) -> Option<&Vec<Action>> {
        self.all.get(id)
    }
    pub fn add(&mut self, id: u16, action: Action) {
        match self.all.get_mut(&id) {
            Some(actions) => {
                actions.push(action);
            },
            None => {
                self.all.insert(id, vec![action]);
            }
        }
    }
}

/// When a unit needs to modify another unit or itself, add an Apply into a vector and it will be modified at the end of the game loop
pub enum Action {
    EntityStateChange {
        state: EntityState,
    },
    Target {
        target_id: Option<u16>,
    },
    Move {
        to: Location
    },
    Damage {
        amount: u16,
    },
}