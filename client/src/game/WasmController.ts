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

    public placePiece(x: number, y: number, unitType: UnitTypeWasm, controller: ControllerWasm) {
        console.log('placing piece')
        return this.wasmState.place_piece(x, y, unitType, controller);
    }

    public step() {
        this.wasmState.step();
    }

    public getEntities() {
        return this.wasmState.get_entities();
    }
    public getEntityById(id: number) {
        return this.wasmState.get_entity_by_id(id);
    }
}

export default WasmController;