import { AnimationAction, AnimationClip, AnimationMixer, Group, Intersection, LoopOnce, Object3D, Quaternion, QuaternionKeyframeTrack, Raycaster, Scene, Vector2, Vector3, VectorKeyframeTrack } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import WasmController from "./WasmController";
import HealthBar from "./HealthBar";
import { Animations, boardCoordinatesTo3D, cloneModel, gridCoordinatesToBoardCoordinates, UnitState } from "./Utils";
import TWEEN from '@tweenjs/tween.js';

class DraggableEntity {
    private animations: Map<Animations, AnimationAction> = new Map();
    private mixer: AnimationMixer;
    private state: UnitState = UnitState.Idle;
    private model: Group;
    private unit: Group;
    private lastGridPosition: Vector2;
    constructor(
        private readonly scene: Scene,
        gltf: GLTF,
        public gridPosition: Vector2,
        private readonly unitType: UnitTypeWasm,
        private readonly controller: ControllerWasm,
    ) {
        // clone model, add to scene and set the initial position.
        this.unit = new Group();
        this.model = cloneModel(gltf.scene) as Group;
        // add to unit
        this.unit.add(this.model);
        this.scene.add(this.unit);

        const convertedPosition = boardCoordinatesTo3D(gridCoordinatesToBoardCoordinates(this.gridPosition));
        if (this.gridPosition.y < 0 || this.gridPosition.y > 7) {
            this.unit.position.set(convertedPosition.x, -2, convertedPosition.z);
        } else {
            this.unit.position.set(convertedPosition.x, convertedPosition.y, convertedPosition.z);
        }
        this.lastGridPosition = this.gridPosition;

        // load animations
        this.mixer = new AnimationMixer( this.model );
        console.log(gltf.animations)
        switch (this.unitType) {
            case UnitTypeWasm.Wolf:
                this.animations.set(Animations.Idle, this.mixer.clipAction(gltf.animations[6]));
                break;
            case UnitTypeWasm.Bull:
                this.animations.set(Animations.Idle, this.mixer.clipAction(gltf.animations[6]));
                break;
            case UnitTypeWasm.Bear:
                this.animations.set(Animations.Idle, this.mixer.clipAction(new AnimationClip('Idle', 3,[])));
                break;
            default:
                throw new Error();
        }
        switch (this.controller) {
            case ControllerWasm.Initializer:
                this.unit.rotation.y = Math.PI;
                break;
            case ControllerWasm.Opponent:
                this.unit.rotation.y = 0;
                break;
        }
        this.playAnimation(Animations.Idle);
        
    }

    public getRaycasterIntersection(raycaster: Raycaster): Intersection[] {
        return raycaster.intersectObject(this.model, true);
    }

    public getGridPosition(): Vector2 | undefined {
        return this.lastGridPosition;
    }

    public setGridPosition(gridPosition: Vector2, otherEntities?: Map<number, DraggableEntity>) {
        if (this.lastGridPosition.x !== gridPosition.x
            || this.lastGridPosition.y !== gridPosition.y
        ) {
            if (otherEntities) {
                for (const entity of otherEntities.values()) {
                    const g = entity.getGridPosition();
                    if (g !== undefined && g.x === gridPosition.x && g.y === gridPosition.y) {
                        return
                    }
                }
            }
            const boardCoordinates = gridCoordinatesToBoardCoordinates(gridPosition);
            this.gridPosition = boardCoordinates;
            const convertedPosition = boardCoordinatesTo3D(boardCoordinates);
            let newPosition = new Vector3(convertedPosition.x, convertedPosition.y, convertedPosition.z)
            if (gridPosition.y < 0 || gridPosition.y > 7) {
                //sidelines
                newPosition = new Vector3(convertedPosition.x, -2, convertedPosition.z)
            }
            console.log(newPosition);
            this.lastGridPosition = gridPosition;
            new TWEEN.Tween({t:0})
                .to({t:1}, 500)
                .onUpdate((tween)=>this.unit.position.lerp(newPosition, tween.t))
                .start();
        }
    }

    public update(timeElapsed: number): void {
        TWEEN.update()
        if (this.mixer !== undefined) this.mixer.update( timeElapsed / 1000 );
    }

    private playAnimation(animation: Animations) {
        const action = this.animations.get(animation)!;
        action.reset();
        action.play();
    }
}
export default DraggableEntity