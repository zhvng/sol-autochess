import * as THREE from "three";
import { AnimationMixer, Camera, LineSegments, Material, Mesh, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import Entity from "./Entity";
import WasmController from "./WasmController";
import { GameProgress, GridBoxGeometry, gridCoordinatesToBoardCoordinates, parseControllerFromAnchor, parseUnitTypeFromAnchor } from "./Utils";
import { Group } from "@tweenjs/tween.js";

import DraggableEntity from "./DraggableEntity";
import HiddenEntity from "./HiddenEntity";


class EntityManager {
    private mixers: Array<AnimationMixer>;
    private readonly models: Map<UnitTypeWasm, GLTF> = new Map();
    private readonly entities: Map<number, Entity> = new Map();
    public readonly draggableEntities: Map<number, DraggableEntity> = new Map();
    public readonly hiddenEntities: Map<number, HiddenEntity> = new Map();
    // public readonly staticEntities: Map<number, StaticEntity> = new Map();
    private wasmController?: WasmController;
    public loading: boolean = true;
    public hasPlacedHand: boolean = false;
    public simulationStarted: boolean = false;
    public simulationEnded: boolean = false;

    constructor(private readonly scene: THREE.Scene,
        private readonly logicUpdatePeriod: number) {

        this.mixers = [];
        const loadingManager = new THREE.LoadingManager();
        loadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
            // console.log( 'Started loading file'+'.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
        };
        
        loadingManager.onLoad = () => {
            console.log( 'Loading complete!');
            this.loading = false;
        };
        
        loadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
            // console.log( 'Loading file: ' + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
        };
        
        loadingManager.onError = function ( url ) {
            console.log( 'There was an error loading ' + url );
        };
        
        const loader = new GLTFLoader(loadingManager);
        loader.setPath('../resources/lowpoly/');
        loader.load('Wolf.gltf', (gltf: GLTF) => {
            //   this.scene.add(gltf.scene);
            //   const mixer = new THREE.AnimationMixer( gltf.scene );
            //   mixer.clipAction( gltf.animations[11] ).play();
            gltf.scene.traverse(c => {
                c.castShadow = true;
            });
            // gltf.scene.rotateY(Math.PI)
            gltf.scene.position.set(0,0,0);
            gltf.scene.scale.set(1,1.5,1);
            this.models.set(UnitTypeWasm.Wolf, gltf);
            // this.mixers.push(mixer);
        });
        loader.load('Bull.gltf', (gltf) => {
            gltf.scene.traverse(c => {
                c.castShadow = true;
            });
            gltf.scene.position.set(0,0,0);
            gltf.scene.scale.set(.7, .7, .7);
            this.models.set(UnitTypeWasm.Bull, gltf);
        });
        loader.setPath('../resources/bear_walk_animation/');
        loader.load('scene.gltf', (gltf) => {
            gltf.scene.traverse(c => {
                c.castShadow = true;
            });
            gltf.scene.position.set(0,0,0);
            gltf.scene.scale.set(4,3,3);
            this.models.set(UnitTypeWasm.Bear, gltf);
        });
    }

    public attachWasmController(wasmController: WasmController) {
        this.wasmController = wasmController;
    }

    public updateGame() {
        this.wasmController.step();
        const entities: Array<any> = this.wasmController.getEntities().all;
        for (const e of entities) {
            if (this.entities.has(e.id)) {
                // do actions
                const entity = this.entities.get(e.id);
                entity?.updateGame(e);
            }
        }
        if (this.wasmController.isSimulationOver()) {
            this.simulationEnded = true;
        }
    }

    public drawAndPlaceHand(random1: Uint8Array, random2: Uint8Array, isInitializer: boolean) {
        const hand: Array<UnitTypeWasm> = this.wasmController.drawHand(random1, random2);
        if (this.hasPlacedHand === false){
            for (const [i, unitType] of hand.entries()) {
                let position: Vector2;
                let playerType: ControllerWasm;
                if (isInitializer) {
                    position = new Vector2(i, -1);
                    playerType = ControllerWasm.Initializer;
                } else {
                    position = new Vector2(7-i, 8)
                    playerType = ControllerWasm.Opponent;
                }
                // place piece
                this.createDraggableEntity(i, position, unitType, playerType);
            }
            this.hasPlacedHand = true
        }
    }

    /**
     * Populate a revealed board retreived from the contract with anchor
     */
    public populateRevealedBoard(allEntities: Array<any>) {
        // remove draggables
        for (const draggableEntity of this.draggableEntities.values()) {
            draggableEntity.remove();
        }
        this.draggableEntities.clear();
        for (const entity of allEntities) {
            this.placeRevealedPiece(entity);
        }
    }

    private placeRevealedPiece(entity: any) {
        if (entity !== undefined 
            && entity.id !== undefined 
            && entity.position !== undefined 
            && entity.unitType !== undefined 
            && entity.owner !== undefined 
            && entity.health !== undefined) {

            const unitType = parseUnitTypeFromAnchor(entity.unitType);
            if (unitType === 'hidden') {
                throw new Error('tried to place hidden piece with placeRevealedPiece')
            }

            const controller = parseControllerFromAnchor(entity.owner);

            this.createEntity(entity.id, 
                new Vector2(entity.position.x, entity.position.y),
                entity.health,
                unitType,
                controller
            );
            this.wasmController.placePieceWithId(entity.id, entity.position.x, entity.position.y, unitType, controller);
        } else {
            throw new Error('incorrect params for entity creation');
        }
    }
    
    public updateOpponentHiddenPieces(allEntities: Array<any>, isInitializer: boolean) {
        const entitiesInPlay: Set<number> = new Set();
        for (const entity of allEntities) {
            if (entity !== undefined 
                && entity.id !== undefined 
                && entity.position !== undefined 
                && entity.unitType !== undefined 
                && entity.owner !== undefined 
                && entity.health !== undefined
            ) {
                const controller = parseControllerFromAnchor(entity.owner);
                if (isInitializer && controller === ControllerWasm.Opponent 
                    || !isInitializer && controller === ControllerWasm.Initializer
                ) { 
                    const unitType = parseUnitTypeFromAnchor(entity.unitType);
                    if (unitType === 'hidden') {
                        const gridX = Math.round((entity.position.x - 50) / 100);
                        const gridY = Math.round((entity.position.y - 50) / 100);
                        const position = new Vector2(gridX, gridY);
                        if (this.hiddenEntities.has(entity.id)) {
                            this.hiddenEntities.get(entity.id).setGridPosition(position);
                            entitiesInPlay.add(entity.id);
                        } else {
                            this.createHiddenEntity(entity.id, position);
                            entitiesInPlay.add(entity.id);
                        }
                    }
                }
            }
        }
        for (const [id, element] of this.hiddenEntities) {
            if (!entitiesInPlay.has(id)) {
                element.remove();
            }
        }
    }

    private createDraggableEntity(id: number, gridPosition: Vector2, unitType: UnitTypeWasm, controller: ControllerWasm): void {
        const entity = new DraggableEntity(
            this.scene, 
            this.models.get(unitType)!, 
            gridPosition, 
            unitType, 
            controller);
        this.draggableEntities.set(id,entity);
    }

    private createHiddenEntity(id: number, gridPosition: Vector2): void {
        const entity = new HiddenEntity(this.scene, gridPosition);
        this.hiddenEntities.set(id, entity);
    }

    private createEntity(id: number, boardPosition: Vector2, startingHealth: number, unitType: UnitTypeWasm, controller: ControllerWasm): void {
        if (this.wasmController !== undefined) {
                this.entities.set(id,
                    new Entity(
                        this.scene, 
                        this.wasmController,
                        this.models.get(unitType)!, 
                        this.logicUpdatePeriod, 
                        boardPosition,
                        unitType, 
                        controller,
                        startingHealth));
        }
    }

    public update(timeElapsed: number): void {

        if (this.entities.size > 0) this.entities.forEach(entity => entity.update( timeElapsed ));
        if (this.draggableEntities.size > 0) this.draggableEntities.forEach(entity => entity.update( timeElapsed ));
    }
}

export default EntityManager;