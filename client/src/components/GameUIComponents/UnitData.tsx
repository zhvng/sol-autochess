import { RarityLevel, UnitStats } from "models/gameTypes";
import { FC } from "react";
import { UnitTypeWasm } from "wasm-client";

export type UnitDataProps = {
    show: boolean;
    unitStats?: UnitStats
}

export const UnitData: FC<UnitDataProps> = (props: UnitDataProps) => {
    const { show, unitStats } = props;
    if (!show || unitStats === undefined) {
        return null;
    }
    const unitDisplayNames = {
        [UnitTypeWasm.Wolf]: "Wolf",
        [UnitTypeWasm.Bear]: "Bear",
        [UnitTypeWasm.Bull]: "Bull",
    }
    const rarityColors = {
        [RarityLevel.Common]: "white",
        [RarityLevel.Uncommon]: "emerald-200",
        [RarityLevel.Rare]: "sky-400",
        [RarityLevel.Epic]: "purple-600",
        [RarityLevel.Legendary]: "orange-500",
        [RarityLevel.Mythic]: "slate-600 text-bold",
    }
    const unitDisplayName = unitDisplayNames[unitStats.unitType];
    const startingHealth = unitStats.startingHealth;
    const health = unitStats.health;
    const attackDamage = unitStats.attackDamage;
    const movementSpeed = unitStats.movementSpeed;
    const range = unitStats.range;
    const crit = unitStats.crit;
    const rarityLevel = unitStats.rarity;

    type RarityProps = {
        rarity: RarityLevel;
    }
    const RarityDisplay = ({rarity}: RarityProps) => {
    
        return (
            <div className={`text-${rarityColors[rarity]}`}>
                {rarity.toString()}
            </div>
        )
    }

    // hack to get tailwind to load color classes
    if (false) {
        return (<div className='text-white text-emerald-200 text-sky-400 text-purple-600 text-orange-500 text-slate-600 text-bold'></div>);
    }
    return (
        <div className={`absolute bottom-0 text-${rarityColors[rarityLevel]}  border-0 right-0 bg-black h-fit m-2 w-56 p-2 shadow`}>
            <div className={`text-xl font-mono text-center text-slate-200`}>
                {unitDisplayName}
            </div>
            <div className='text-sm font-mono'>
                <div><span className='text-slate-300'>health:</span> {health}/{startingHealth}</div>
                <div><span className='text-slate-300'>attack:</span> {attackDamage}</div>
                <div><span className='text-slate-300'>speed:</span> {movementSpeed}</div>
                <div><span className='text-slate-300'>crit:</span> {crit}%</div>
                <div>
                    <div className='float-left'><span className='text-slate-300'>range:</span> {range}</div>
                    <div className='float-right'>
                        <RarityDisplay rarity={rarityLevel} />
                    </div>
                </div>
            </div>
            
        </div>
    );
}