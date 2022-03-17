import * as THREE from "three";
import { AnimationMixer, Camera, LineSegments, Material, Mesh, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import Entity from "./Entity";
import WasmController from "./WasmController";
import { GameProgress, GridBoxGeometry, gridCoordinatesToBoardCoordinates, parseControllerFromAnchor, parseUnitTypeFromAnchor } from "./Utils";
import { Group } from "@tweenjs/tween.js";

import DraggableEntity from "./DraggableEntity";


class EntityManager {
    private mixers: Array<AnimationMixer>;
    private readonly models: Map<UnitTypeWasm, GLTF> = new Map();
    private readonly entities: Map<number, Entity> = new Map();
    public readonly draggableEntities: Map<number, DraggableEntity> = new Map();
    // public readonly staticEntities: Map<number, StaticEntity> = new Map();
    private wasmController?: WasmController;
    public loading: boolean = true;
    public hasPlacedHand: boolean = false;
    public simulationInProgress: boolean = false;

    constructor(private readonly scene: THREE.Scene,
        private readonly logicUpdatePeriod: number) {

        this.mixers = [];
        const loadingManager = new THREE.LoadingManager();
        loadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
            console.log( 'Started loading file'+'.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
        };
        
        loadingManager.onLoad = () => {
            console.log( 'Loading complete!');
            this.loading = false;
        };
        
        loadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
            console.log( 'Loading file: ' + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
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
        // console.log(entities);
        for (const e of entities) {
            if (this.entities.has(e.id)) {
                // do actions
                const entity = this.entities.get(e.id);
                entity?.updateGame(e);
            }
        }
        if (this.wasmController.isSimulationOver()) {
            this.simulationInProgress = false;
        }
    }

    public drawAndPlaceHand(random1: Uint8Array, random2: Uint8Array, isInitializer: boolean) {
        const hand: Array<UnitTypeWasm> = this.wasmController.drawHand(random1, random2);
        console.log(hand);
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

    private placeStaticPieces(entity: any) {
        if (entity && entity.id && entity.position && entity.unitType && entity.owner) {
            const controller = parseControllerFromAnchor(entity.owner);
            const unitType = parseUnitTypeFromAnchor(entity.unitType);
            if (unitType === 'hidden') {
                // if (this.contractController.isInitializer && controller === ControllerWasm.Opponent
                //     || !this.contractController.isInitializer && controller === ControllerWasm.Initializer ) {

                // }

            }
        }
    }

    private placeRevealedPiece(entity: any) {
        console.log('entity', entity);
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
        // const entity = new DraggableEntity(
        //     this.scene, 
        //     this.models.get(unitType)!, 
        //     gridPosition, 
        //     unitType, 
        //     controller);
        // this.draggableEntities.set(id,entity);
    }

    private createEntity(id: number, boardPosition: Vector2, startingHealth: number, unitType: UnitTypeWasm, controller: ControllerWasm): void {
        console.log(id);
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