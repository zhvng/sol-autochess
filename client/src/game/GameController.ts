import { ControllerWasm, UnitTypeWasm, WasmState } from "wasm-client";

class GameController {
    private wasmState: WasmState;

    constructor() {
        this.wasmState = new WasmState();
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

export default GameController;