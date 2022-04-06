import { Program, web3 } from "@project-serum/anchor";
import { AnchorWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import TWEEN from "@tweenjs/tween.js";
import useGameStateStore from "stores/useGameStateStore";
import { Camera, QuadraticBezierCurve, Scene, Vector3 } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { clearGameInputs, GameInputs } from "utils/gameInputs";
import { notify } from "utils/notifications";
import { getProgram } from "utils/program";
import { ControllerWasm, UnitTypeWasm, WasmState, draw_private_hand } from "wasm-client";
import { GameProgress } from "./Utils";
import BN from 'bn.js';
import Game from "./Game";

class WasmController {
    private wasmState: WasmState;

    constructor() {
        this.wasmState = new WasmState();
    }

    public drawHand(randomness1: Uint8Array, randomness2: Uint8Array): Array<UnitTypeWasm> {
        const stringHand = draw_private_hand(randomness1, randomness2);
        const hand: Array<UnitTypeWasm> = [];
        console.log(stringHand);
        for (const unit of stringHand) {
            switch (unit) {
                case 'Wolf':
                    hand.push(UnitTypeWasm.Wolf);
                    break;
                case 'Bear':
                    hand.push(UnitTypeWasm.Bear);
                    break;
                case 'Bull':
                    hand.push(UnitTypeWasm.Bull);
                    break;
            }
        }
        return hand;
    }

    public setReveals(reveal1: Uint8Array, reveal2: Uint8Array) {
        this.wasmState.set_reveals(reveal1, reveal2);

        console.log(this.wasmState.get_game());
    }

    public placePiece(x: number, y: number, unitType: UnitTypeWasm, controller: ControllerWasm) {
        console.log('placing piece')
        return this.wasmState.place_piece(x, y, unitType, controller);
    }

    public placePieceWithId(id: number, x: number, y: number, unitType: UnitTypeWasm, controller: ControllerWasm) {
        console.log('placing piece')
        return this.wasmState.place_piece_with_id(id, x, y, unitType, controller);
    }

    public step() {
        this.wasmState.step();
    }

    public isSimulationOver() {
        const winCondition = this.wasmState.get_win_condition();
        console.log(winCondition);
        if (winCondition !== 'InProgress') return true; 
        return false;
    }

    public getEntities() {
        return this.wasmState.get_entities();
    }
    public getEntityById(id: number) {
        return this.wasmState.get_entity_by_id(id);
    }
}

export default WasmController;