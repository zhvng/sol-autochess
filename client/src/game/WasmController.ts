import { RawCard, RawCardAnchor, UnitStats } from "models/gameTypes";
import { ControllerWasm, UnitTypeWasm, WasmState, draw_private_hand } from "wasm-client";
import { parseRarityFromAnchor, parseRawCard, parseUnitTypeFromAnchor } from "./Utils";

class WasmController {
    private wasmState: WasmState;

    constructor() {
        this.wasmState = new WasmState();
    }

    public drawHand(randomness1: Uint8Array, randomness2: Uint8Array): Array<UnitStats> {
        const cardHand: Array<RawCard> = draw_private_hand(randomness1, randomness2);
        console.log(cardHand);
        const hand: Array<UnitStats> = [];
        for (const card of cardHand) {
            hand.push(parseRawCard(card));
        }
        return hand
    }

    public setReveals(reveal1: Uint8Array, reveal2: Uint8Array) {
        this.wasmState.set_reveals(reveal1, reveal2);

        console.log(this.wasmState.get_game());
    }

    public placePiece(x: number, y: number, card: RawCard, controller: ControllerWasm) {
        console.log('placing piece')
        return this.wasmState.place_piece(x, y, card, controller);
    }

    public placePieceWithId(id: number, x: number, y: number, card: RawCard | RawCardAnchor, controller: ControllerWasm) {
        console.log('placing piece')
        return this.wasmState.place_piece_with_id(id, x, y, card, controller);
    } 

    public step() {
        this.wasmState.step();
    }

    public isSimulationOver() {
        const winCondition = this.wasmState.get_win_condition();
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