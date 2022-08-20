import * as THREE from "three";
import { AnimationMixer, Camera, LineSegments, Material, Mesh, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import Entity from "./Entity";
import WasmController from "./WasmController";
import { GameProgress, GridBoxGeometry, gridCoordinatesToBoardCoordinates, parseControllerFromAnchor, parseUnitTypeFromAnchor } from "./Utils";
import { Group } from "@tweenjs/tween.js";
import ContractController from "./ContractController";
import DraggableEntity from "./DraggableEntity";
import EntityManager from "./EntityManager";

class PiecePlacementManager {

    private contractController?: ContractController
    private mouse?: Vector2;
    private readonly raycaster: Raycaster;
    private dragging?: number;
    private draggingLastSafeGridPosition?: Vector2;
    private readonly boardGrid: LineSegments;
    private readonly interactiveBoardPlane: Mesh;

    constructor(private readonly scene: THREE.Scene,
        private readonly camera: Camera,
        private readonly entityManager: EntityManager) {

        this.interactiveBoardPlane = this.createInteractiveBoardPlane();
        this.boardGrid = this.createBoardGrid();
        this.raycaster = new Raycaster(this.camera.position);
        this.setupMouse();

    }

    public attachNewContract(contractController: ContractController) {
        this.contractController = contractController;
        if (this.contractController.isInitializer) {
            this.interactiveBoardPlane.position.z = 12.5;
        } else {
            this.interactiveBoardPlane.position.z = -12.5;
        }
    }

    private setupMouse() {
        this.mouse = new Vector2(1,1);

        window.addEventListener('mousemove', (event: MouseEvent)=>{
            this.mousemove(event.clientX, event.clientY);
        });
        window.addEventListener('touchmove', (event: TouchEvent)=>{
            this.mousemove(event.touches[0].clientX, event.touches[0].clientY);
        });
        
        window.addEventListener('mouseup', (event: MouseEvent)=>{
            this.mouseup();
        });
        window.addEventListener('touchend', (event: MouseEvent)=>{
            this.mouseup();
        });

        window.addEventListener('mousedown', (event: MouseEvent)=>{
            this.mousedown();
        });
        window.addEventListener('touchstart', (event: TouchEvent)=>{
            this.touchstart(event.touches[0].clientX, event.touches[0].clientY);
        });

    }

    public mousemove(clientX: number, clientY: number){
        if (this.mouse === undefined) {
            this.mouse = new Vector2(1, 1);
        }
    	this.mouse.setX(clientX / window.innerWidth * 2 - 1);
    	this.mouse.setY(- clientY / window.innerHeight * 2 + 1);

        if (this.raycaster !== undefined) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            console.log(this.dragging, this.contractController);
            if (this.dragging !== undefined) {
                const intersect: Array<THREE.Intersection> = this.raycaster.intersectObject(this.interactiveBoardPlane, false);
                if (intersect.length > 0) {
                    const point: Vector3 = intersect[0].point;
                    const x = point.x;
                    const z = point.z;

                    const boardX = Math.round((x + 20) * 20);
                    const boardY = Math.round((-z + 20) * 20);

                    const gridX = Math.round((boardX - 50) / 100);
                    const gridY = Math.round((boardY - 50) / 100);

                    this.entityManager.draggableEntities.get(this.dragging).setGridPosition(new Vector2(gridX, gridY), this.entityManager.draggableEntities);
                }
            } else {
                if (this.contractController !== undefined) {
                    for (const [i, entity] of this.entityManager.draggableEntities) {
                        const intersect: Array<THREE.Intersection> = entity.getRaycasterIntersection(this.raycaster)
                        if (intersect.length > 0) {
                            this.contractController.drawUnitData(true, entity.unitStats);
                            return;
                        }
                    }
                    for (const [i, entity] of this.entityManager.entities) {
                        const intersect: Array<THREE.Intersection> = entity.getRaycasterIntersection(this.raycaster)
                        if (intersect.length > 0) {
                            this.contractController.drawUnitData(true, entity.unitStats);
                            return;
                        }
                    }
                    this.contractController.drawUnitData(false); 
                }
            }
        }
    }
    public mousedown(){
        if (this.raycaster !== undefined) {
            for (const [i, entity] of this.entityManager.draggableEntities) {
                const intersect: Array<THREE.Intersection> = entity.getRaycasterIntersection(this.raycaster)
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
    public touchstart(clientX: number, clientY: number){
        this.mousemove(clientX, clientY);
        this.mousedown()
    }

    public async mouseup(){
        if (this.raycaster !== undefined) {
            if (this.dragging !== undefined && this.draggingLastSafeGridPosition !== undefined) {
                // place dragging piece,
                const draggingId = this.dragging;
                const lastSafePosition = this.draggingLastSafeGridPosition;
                this.dragging = undefined;
                this.draggingLastSafeGridPosition = undefined;
                if (this.contractController !== undefined) {
                    const draggedEntity: DraggableEntity = this.entityManager.draggableEntities.get(draggingId);
                    const gridPosition = draggedEntity.getGridPosition();

                    draggedEntity.setPending(true);

                    let success = false;
                    if (gridPosition.y >= 0 && gridPosition.y <=7) {
                        if (lastSafePosition.y < 0 || lastSafePosition.y > 7) {
                            success = await this.contractController.placePiece(gridPosition.x, gridPosition.y, draggingId);
                        } else {
                            if (gridPosition.x !== lastSafePosition.x || gridPosition.y !== lastSafePosition.y) {
                                success = await this.contractController.movePiece(gridPosition.x, gridPosition.y, draggingId);
                            }
                        }

                    } else {
                        if (lastSafePosition.y >= 0 && lastSafePosition.y <= 7) { 
                            success = await this.contractController.removePiece(draggingId);
                        } else {
                            success = true;
                        }
                    }
                    if (!success) {
                        this.entityManager.draggableEntities.get(draggingId).setGridPosition(lastSafePosition);
                    }
                    draggedEntity.setPending(false);
                }
            }

            this.boardGrid.position.set(0, 0, 0);
            (this.boardGrid.material as Material).visible = false;
        }
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
}

export default PiecePlacementManager;