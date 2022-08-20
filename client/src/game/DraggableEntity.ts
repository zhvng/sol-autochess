import { AnimationAction, AnimationClip, AnimationMixer, BoxBufferGeometry, Color, Group, Intersection, LoopOnce, Mesh, MeshStandardMaterial, Object3D, Quaternion, QuaternionKeyframeTrack, Raycaster, RGBAFormat, Scene, SkinnedMesh, Sprite, SpriteMaterial, TextureLoader, Vector2, Vector3, VectorKeyframeTrack } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import WasmController from "./WasmController";
import HealthBar from "./HealthBar";
import { Animations, boardCoordinatesTo3D, cloneModel, gridCoordinatesToBoardCoordinates, UnitState } from "./Utils";
import TWEEN from '@tweenjs/tween.js';
import { UnitStats } from "models/gameTypes";

class DraggableEntity {
    private animations: Map<Animations, AnimationAction> = new Map();
    private mixer: AnimationMixer;
    private state: UnitState = UnitState.Idle;
    private model: Group;
    private loadingSprite: Sprite;
    private dragBox: Mesh;
    private unit: Group;
    private lastGridPosition: Vector2;
    constructor(
        public readonly id,
        private readonly scene: Scene,
        gltf: GLTF,
        public gridPosition: Vector2,
        private readonly unitType: UnitTypeWasm,
        private readonly controller: ControllerWasm,
        public readonly unitStats: Readonly<UnitStats>
    ) {
        // Clone model, add to scene and set the initial position.
        this.unit = new Group();
        this.model = cloneModel(gltf.scene) as Group;
        this.unit.add(this.model);

        // Add a box for player to drag by
        this.dragBox = new Mesh(
            new BoxBufferGeometry(4, 4, 4),
            new MeshStandardMaterial({
                visible: false,
            })
        );
        this.unit.add(this.dragBox)

        // Add sprite for loading
        const map = new TextureLoader().load('../resources/sprites/loading.png');
        const material = new SpriteMaterial( { map } );
        
        const sprite = new Sprite( material );

        sprite.scale.set(1.5, 2, 1);
        sprite.position.set(0, 5, 0);
        sprite.visible = false;
        this.loadingSprite = sprite;
        this.unit.add(sprite);

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

    public remove() {
        this.scene.remove(this.unit);
    }

    public getRaycasterIntersection(raycaster: Raycaster): Intersection[] {
        return raycaster.intersectObject(this.dragBox, false);
    }

    public getGridPosition(): Vector2 | undefined {
        return this.lastGridPosition;
    }

    public setPending(pending: boolean) {
        // const opacity = pending ? 0.25 : 1;
        // const transparent = pending;
        // this.model.traverse((node)=>{
        //     if (node instanceof SkinnedMesh) {
        //         node.material.opacity = opacity;
        //         node.material.transparent = transparent;
        //     }
        // })
        this.loadingSprite.visible = pending
        

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