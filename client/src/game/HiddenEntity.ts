import { AnimationAction, AnimationClip, AnimationMixer, BoxBufferGeometry, CircleBufferGeometry, DoubleSide, Group, Intersection, LoopOnce, Mesh, MeshStandardMaterial, Object3D, PlaneBufferGeometry, Quaternion, QuaternionKeyframeTrack, Raycaster, Scene, TextureLoader, Vector2, Vector3, VectorKeyframeTrack } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import WasmController from "./WasmController";
import HealthBar from "./HealthBar";
import { Animations, boardCoordinatesTo3D, cloneModel, gridCoordinatesToBoardCoordinates, UnitState } from "./Utils";
import TWEEN from '@tweenjs/tween.js';

class HiddenEntity {
    private mixer: AnimationMixer;
    private model: Group;
    private unit: Group;
    private lastGridPosition: Vector2;
    constructor(
        private readonly scene: Scene,
        public gridPosition: Vector2,
    ) {
        // clone model, add to scene and set the initial position.
        this.unit = new Group();
        const indicator = this.createIndicator();
        this.unit.add(indicator);
        indicator.rotation.x = Math.PI/2;
        indicator.position.y = .05
        this.scene.add(this.unit);

        // add to unit
        this.scene.add(this.unit);

        const convertedPosition = boardCoordinatesTo3D(gridCoordinatesToBoardCoordinates(this.gridPosition));
        if (this.gridPosition.y < 0 || this.gridPosition.y > 7) {
            this.unit.position.set(convertedPosition.x, -2, convertedPosition.z);
        } else {
            this.unit.position.set(convertedPosition.x, convertedPosition.y, convertedPosition.z);
        }
        this.lastGridPosition = this.gridPosition;

        // load animations
        this.mixer = new AnimationMixer( this.unit );
        // this.mixer.clipAction().play();
    }

    public remove() {
        this.scene.remove(this.unit);
    }

    public getGridPosition(): Vector2 | undefined {
        return this.lastGridPosition;
    }
    private createIndicator(): Mesh {

        const texture = new TextureLoader().load( "../resources/textures/test2.jpeg" );
        const indicator = new Mesh(
            new PlaneBufferGeometry(4,4),
            new MeshStandardMaterial({
                map: texture,
                color: '#006400',
                side: DoubleSide,
            })
        );
        return indicator;
    }

    public setGridPosition(gridPosition: Vector2) {
        if (this.lastGridPosition.x !== gridPosition.x
            || this.lastGridPosition.y !== gridPosition.y
        ) {
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
}
export default HiddenEntity