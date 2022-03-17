import * as THREE from "three";
import { AnimationMixer, Camera, LineSegments, Material, Mesh, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import Entity from "./Entity";
import WasmController from "./WasmController";
import { GameProgress, GridBoxGeometry, gridCoordinatesToBoardCoordinates } from "./Utils";
import { Group } from "@tweenjs/tween.js";
import ContractController from "./ContractController";
import DraggableEntity from "./DraggableEntity";


class EntityManager {
    private mixers: Array<AnimationMixer>;
    private readonly models: Map<UnitTypeWasm, GLTF> = new Map();
    private readonly entities: Map<number, Entity> = new Map();
    private readonly draggableEntities: Map<number, DraggableEntity> = new Map();
    private wasmController?: WasmController;
    private contractController?: ContractController;
    public loading: boolean = true;
    public hasPlacedHand: boolean = false;

    private mouse?: Vector2;
    private readonly raycaster: Raycaster;
    private dragging?: number;
    private draggingLastSafeGridPosition?: Vector2;
    private readonly boardGrid: LineSegments;
    private readonly interactiveBoardPlane: Mesh;

    constructor(private readonly scene: THREE.Scene,
        private readonly logicUpdatePeriod: number,
        private readonly camera: Camera) {

        this.interactiveBoardPlane = this.createInteractiveBoardPlane();
        this.boardGrid = this.createBoardGrid();
        this.raycaster = new Raycaster(this.camera.position);
        this.setupMouse();

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

    public attachToNewGame(wasmController: WasmController) {
        this.wasmController = wasmController;
        this.draggableEntities.clear();
        this.entities.clear();
    }

    public attachToNewContract(contractController: ContractController) {
        this.contractController = contractController;
        this.draggableEntities.clear();
        this.entities.clear();
        if (this.contractController.isInitializer) {
            this.interactiveBoardPlane.position.z = 12.5;
        } else {
            this.interactiveBoardPlane.position.z = -12.5;
        }
    }

    public updateGame(entities: Array<any>) {
        // console.log(entities);
        for (const e of entities) {
            if (this.entities.has(e.id)) {
                // do actions
                const entity = this.entities.get(e.id);
                entity?.updateGame(e);
            }
        }
        /*
        {id: 3, owner: 'Opponent', target: null, speed_multiplier: 100, position: {…}, …}
health: 100
id: 3
owner: "Opponent"
position: {x: 246, y: 411}
speed_multiplier: 100
state: {Moving: {…}}
target: null
unit_type: "Wolf"*/
    }
    public placePiece(gridX: number, gridY: number, unitType: UnitTypeWasm, controller: ControllerWasm) {
        if (this.wasmController !== undefined) {
            const id = this.wasmController.placePiece(gridX, gridY, unitType, controller);
            const entity = this.wasmController.getEntityById(id);
            console.log(id);
            this.createEntity(id, entity, unitType, controller);
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
    private createDraggableEntity(id: number, gridPosition: Vector2, unitType: UnitTypeWasm, controller: ControllerWasm): void {
        const entity = new DraggableEntity(
            this.scene, 
            this.models.get(unitType)!, 
            gridPosition, 
            unitType, 
            controller);
        this.draggableEntities.set(id,entity);
    }

    private createEntity(id: number, entity: any, unitType: UnitTypeWasm, controller: ControllerWasm): void {
        if (this.wasmController !== undefined) {
            if ('health' in entity && 'position' in entity) {
                this.entities.set(id,
                    new Entity(
                        this.scene, 
                        this.wasmController,
                        this.models.get(unitType)!, 
                        this.logicUpdatePeriod, 
                        new Vector2(entity.position.x, entity.position.y), 
                        unitType, 
                        controller,
                        entity.health));
            }
        }
    }

    public update(timeElapsed: number): void {

        if (this.entities.size > 0) this.entities.forEach(entity => entity.update( timeElapsed ));
        if (this.draggableEntities.size > 0) this.draggableEntities.forEach(entity => entity.update( timeElapsed ));
    }

    private setupMouse() {
        this.mouse = new Vector2(1,1);

        window.addEventListener('mousemove', (event: MouseEvent)=>{
            this.mousemove(event);
        });
        window.addEventListener('mouseup', (event: MouseEvent)=>{
            this.mouseup(event);
        });
        window.addEventListener('mousedown', (event: MouseEvent)=>{
            this.mousedown(event);
        });
    }

    private createInteractiveBoardPlane(): Mesh {
        const plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(39, 25, 8, 8),
            new THREE.MeshStandardMaterial({
                visible: false,
            })
        );
        plane.position.y = 0;
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);
        return plane
    }

    private createBoardGrid(): LineSegments {
        const grid = new THREE.LineSegments(
            GridBoxGeometry(new THREE.BoxBufferGeometry(40, 40, 0, 8, 8), false),
            new THREE.LineBasicMaterial({
                color: 'white',
                visible: false,
            })  
        );
        grid.position.set(0,1,0);
        grid.castShadow = false;
        grid.receiveShadow = true;
        grid.rotation.x = -Math.PI / 2;
        this.scene.add(grid);
        return grid;
    }

    public mousemove(event: MouseEvent){
        if (this.mouse === undefined) {
            this.mouse = new Vector2(1, 1);
        }
    	this.mouse.setX(event.clientX / window.innerWidth * 2 - 1);
    	this.mouse.setY(- event.clientY / window.innerHeight * 2 + 1);

        if (this.raycaster !== undefined) {
            this.raycaster.setFromCamera(this.mouse, this.camera);

            if (this.dragging !== undefined) {
                const intersect: Array<THREE.Intersection> = this.raycaster.intersectObject(this.interactiveBoardPlane, false);
                if (intersect.length === 1) {
                    const point: Vector3 = intersect[0].point;
                    const x = point.x;
                    const z = point.z;

                    const boardX = Math.round((x + 20) * 20);
                    const boardY = Math.round((-z + 20) * 20);

                    const gridX = Math.round((boardX - 50) / 100);
                    const gridY = Math.round((boardY - 50) / 100);
                    console.log(gridX, gridY)

                    this.draggableEntities.get(this.dragging).setGridPosition(new Vector2(gridX, gridY), this.draggableEntities);
                }
            }
        }
    }
    public mousedown(event: MouseEvent){
        if (this.raycaster !== undefined) {

            for (const [i, entity] of this.draggableEntities) {
                const intersect: Array<THREE.Intersection> = entity.getRaycasterIntersection(this.raycaster)
                console.log(intersect);
                if (intersect.length > 0) {
                    this.dragging = i;
                    this.draggingLastSafeGridPosition = entity.getGridPosition();

                    this.boardGrid.position.lerp(new Vector3(0, 1, 0), .5);
                    (this.boardGrid.material as Material).visible = true;
                    return;
                }
            }
        }
    }

    public async mouseup(event: MouseEvent){
        if (this.raycaster !== undefined) {
            if (this.dragging !== undefined) {
                // place dragging piece,
                const draggingId = this.dragging;
                const lastSafePosition = this.draggingLastSafeGridPosition;
                this.dragging = undefined;
                this.draggingLastSafeGridPosition = undefined;
                if (this.contractController !== undefined) {
                    const gridPosition = this.draggableEntities.get(draggingId).getGridPosition();

                    if (gridPosition.y >= 0 && gridPosition.y <=7) {
                        const success = await this.contractController.placePiece(gridPosition.x, gridPosition.y, draggingId);
                        console.log(success);
                        if (!success) {
                            this.draggableEntities.get(draggingId).setGridPosition(lastSafePosition);
                        }
                    }
                }
            }

            this.boardGrid.position.set(0, 0, 0);
            (this.boardGrid.material as Material).visible = false;
        }
    }
}

export default EntityManager;