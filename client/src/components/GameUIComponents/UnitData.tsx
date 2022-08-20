import { RarityLevel, SpecialTrait, UnitStats } from "models/gameTypes";
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

    // convert our stats to an understandable format
    const TICKS_PER_SECOND = 5;
    const unitDisplayName = unitDisplayNames[unitStats.unitType];
    const startingHealth = unitStats.startingHealth;
    const health = unitStats.health;
    const attackDamage = unitStats.attackDamage;
    const movementSpeed = (unitStats.movementSpeed * TICKS_PER_SECOND / 100).toFixed(1) + ' sq/s';
    const range = (unitStats.range / 100).toFixed(2) + ' sq';
    const crit = (unitStats.crit / 255).toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 1 });
    const rarityLevel = unitStats.rarity;
    const attackSpeed = (TICKS_PER_SECOND / unitStats.attackDuration).toFixed(2) + ' atk/s';
    const specialTrait = unitStats.specialTrait;

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

    type SpecialTraitDisplayProps = {
        specialTrait: SpecialTrait;
    }
    const SpecialTraitDisplay = ({specialTrait}: SpecialTraitDisplayProps) => {
        switch(specialTrait) {
            case SpecialTrait.None:
                return null;
            case SpecialTrait.Assassin:
                return (
                    <div className='w-fit border-2 border-red-300 text-red-300 px-2'>Assassin</div>
                )
            default:
                return null;
        }
    }

    // hack to get tailwind to load color classes
    if (false) {
        return (<div className='text-white text-emerald-200 text-sky-400 text-purple-600 text-orange-500 text-slate-600 text-bold'></div>);
    }
    return (
        <div className={`absolute bottom-0 text-${rarityColors[rarityLevel]}  border-0 right-0 bg-black h-fit m-2 w-72 p-2 shadow`}>
            <div className={`text-xl font-mono text-center text-slate-200`}>
                {unitDisplayName}
                <div className='inline-block align-middle ml-4 text-sm font-mono'>
                <SpecialTraitDisplay specialTrait={specialTrait}/>
            </div>
            </div>
            <div className='text-md font-mono'>
                <div><span className='text-slate-300'>health:</span> {health}/{startingHealth}</div>
                <div><span className='text-slate-300'>damage:</span> {attackDamage}</div>
                <div><span className='text-slate-300'>atkspd:</span> {attackSpeed}</div>
                <div><span className='text-slate-300'>crit %:</span> {crit}</div>
                <div><span className='text-slate-300'>movemt:</span> {movementSpeed}</div>
                <div>
                    <div className='float-left'><span className='text-slate-300'>range :</span> {range}</div>
                    <div className='float-right'>
                        <RarityDisplay rarity={rarityLevel} />
                    </div>
                </div>
            </div>
            
        </div>
    );
}