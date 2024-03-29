import { UnitTypeWasm } from "wasm-client"

export enum RarityLevel {
    Common = "Common",
    Uncommon = "Uncommon",
    Rare = "Rare",
    Epic = "Epic",
    Legendary = "Legendary",
    Mythic = "Mythic",
}

export enum SpecialTrait {
    Assassin = "Assassin",
    None = "None",
}
  
export type UnitStats = {
    unitType: UnitTypeWasm,
    attackDamage: number,
    startingHealth: number,
    health: number,
    movementSpeed: number,
    attackDuration: number,
    range: number,
    crit: number,
    rarity: RarityLevel,
    specialTrait: SpecialTrait,
}

export type RawCard = {
    stats: {
        attack_damage: number
        attack_duration: number
        attack_range: number
        crit_chance: number
        movement_speed: number
        starting_health: number
    },
    unit_type: string,
    rarity: string,
    special_trait: string | null,
}

export type RawCardAnchor = {
    stats: {
        attackDamage: number
        attackDuration: number
        attackRange: number
        critChance: number
        movementSpeed: number
        startingHealth: number
    }, 
    unitType: {
        [key:string]: any
    },
    rarity: {
        [key:string]: any
    },
    specialTrait: {
        [key:string]: any
    } | null,
}