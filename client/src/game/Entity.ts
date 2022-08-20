import { AnimationAction, AnimationClip, AnimationMixer, BoxBufferGeometry, Group, Intersection, LoopOnce, Mesh, MeshStandardMaterial, Object3D, Quaternion, QuaternionKeyframeTrack, Raycaster, Scene, Vector2, Vector3, VectorKeyframeTrack } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import WasmController from "./WasmController";
import HealthBar from "./HealthBar";
import { Animations, boardCoordinatesTo3D, cloneModel, gridCoordinatesToBoardCoordinates, UnitState } from "./Utils";
import TWEEN from '@tweenjs/tween.js';
import { UnitStats } from "models/gameTypes";

class Entity {
    private movementTarget?: Vector3;
    private attackTargetId?: number;
    private animations: Map<Animations, AnimationAction> = new Map();
    private mixer: AnimationMixer;
    private previousAnimation: Animations;
    private state: UnitState = UnitState.Idle;
    private model: Group;
    private dragBox: Mesh;
    private healthBar: HealthBar;
    private unit: Group;
    constructor(
        public readonly id: number,
        private readonly scene: Scene,
        private readonly wasmController: WasmController,
        gltf: GLTF,
        private readonly logicUpdatePeriod: number,
        public initialBoardPosition: Vector2,
        private readonly unitType: UnitTypeWasm,
        private readonly controller: ControllerWasm,
        public readonly unitStats: Readonly<UnitStats>,
    ) {
        // clone model, add to scene and set the initial position.
        this.unit = new Group();
        this.model = cloneModel(gltf.scene) as Group;
        // Add health bar
        this.healthBar = new HealthBar(this.unit, this.controller, unitStats.startingHealth);
        // add to unit
        this.unit.add(this.model);

        // Add a box for collisions
        this.dragBox = new Mesh(
            new BoxBufferGeometry(4, 4, 4),
            new MeshStandardMaterial({
                visible: false,
            })
        );
        this.unit.add(this.dragBox)
        this.scene.add(this.unit);

        const convertedPosition = boardCoordinatesTo3D(this.initialBoardPosition);
        if (this.initialBoardPosition.y < 0 || this.initialBoardPosition.y > 800) {
            this.unit.position.set(convertedPosition.x, -2, convertedPosition.z);
        } else {
            this.unit.position.set(convertedPosition.x, convertedPosition.y, convertedPosition.z);
        }

        // load animations
        this.mixer = new AnimationMixer( this.model );
        switch (this.unitType) {
            case UnitTypeWasm.Wolf:
                this.animations.set(Animations.Walk, this.mixer.clipAction(gltf.animations[3]));
                this.animations.set(Animations.Attack, this.mixer.clipAction(gltf.animations[0]).setLoop(LoopOnce, 1).setEffectiveTimeScale(.65));
                this.animations.set(Animations.Idle, this.mixer.clipAction(gltf.animations[6]));
                const wolfDead = this.mixer.clipAction(gltf.animations[1]).setLoop(LoopOnce,1);
                wolfDead.clampWhenFinished = true;
                this.animations.set(Animations.Die, wolfDead);
                break;
            case UnitTypeWasm.Bull:
                this.animations.set(Animations.Walk, this.mixer.clipAction(gltf.animations[4]));
                this.animations.set(Animations.Attack, this.mixer.clipAction(gltf.animations[0]).setLoop(LoopOnce, 1).setEffectiveTimeScale(0.4));
                this.animations.set(Animations.Idle, this.mixer.clipAction(gltf.animations[6]));
                const bullDead = this.mixer.clipAction(gltf.animations[2]).setLoop(LoopOnce,1);
                bullDead.clampWhenFinished = true;
                this.animations.set(Animations.Die, bullDead);
                break;
            case UnitTypeWasm.Bear:
                this.animations.set(Animations.Walk, this.mixer.clipAction(gltf.animations[0]));
                const bearHeadMove = gltf.animations[0].tracks[28];

                this.animations.set(Animations.Attack, this.mixer.clipAction(new AnimationClip('Idle', 2,[bearHeadMove, new VectorKeyframeTrack( 'Bear_Neck_01SHJnt_20.position', [ 0, 1, 2 ], [ .05, 0, 0, .1, -.02, 0, 0, 0, 0 ] ) ])).setLoop(LoopOnce, 1).setEffectiveTimeScale(.8));
                this.animations.set(Animations.Idle, this.mixer.clipAction(new AnimationClip('Idle', 3,[])));

                const axis = new Vector3( 0, 0, 1 );
                const qInitial = new Quaternion().setFromAxisAngle( axis, 0 );
                const qFinal = new Quaternion().setFromAxisAngle( axis, -Math.PI/2 );

                const quaternionKF = new QuaternionKeyframeTrack( '.quaternion', [ 0, 1 ], [ qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w ] );
                const bearDieClip = new AnimationClip('Action', 3, [ quaternionKF ] );
                // const bearDieClip = new AnimationClip('Action', 3, [ new VectorKeyframeTrack( '.position', [ 0, 1], [ 0, 0, 0, 0, -1.5, 0])]);
                const bearDead = this.mixer.clipAction(bearDieClip).setLoop(LoopOnce, 1)
                bearDead.clampWhenFinished = true;

                this.animations.set(Animations.Die, bearDead);
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
        this.previousAnimation = Animations.Walk;
        this.playAnimation(Animations.Idle);
        
    }

    public update(timeElapsed: number): void {
        TWEEN.update()

        if (this.mixer !== undefined) this.mixer.update( timeElapsed / 1000 );
        if (this.movementTarget !== undefined && this.state !== UnitState.Dead) {
            const displacementVector = this.movementTarget.clone().sub(this.unit.position);
            const timeRatio = timeElapsed/this.logicUpdatePeriod;
            const newPosition = this.unit.position.clone().add(displacementVector.clone().multiplyScalar(timeRatio));
            this.smoothLookAt(this.unit, this.movementTarget, 300);
            this.unit.position.set(newPosition.x, newPosition.y, newPosition.z);
        }
        if (this.healthBar !== undefined) {
            this.healthBar.update(timeElapsed);
        }
    }
    public updateGame(e: any): void {
        if (e.state['Moving'] !== undefined) {
            const targetPosition = e.state['Moving'].to;
            this.setMovementTarget(new Vector2(targetPosition.x, targetPosition.y));
            this.setState(UnitState.Moving);
        } else {
            this.stopMoving();
        }

        if (e.state['Attack'] !== undefined) {
            const targetId = e.state['Attack'].target_id;
            if (this.attackTargetId !== targetId) {
                const target_position = this.wasmController.getEntityById(targetId).position ?? {x: 400, y: 400};
                this.attackTargetId = targetId
                this.smoothLookAt(this.unit, boardCoordinatesTo3D(new Vector2(target_position.x, target_position.y)), 500);
            }
            this.setState(UnitState.Attacking);
        } else {
            this.attackTargetId = undefined;
        }

        if (e.state === 'Idle') {
            this.setState(UnitState.Idle);
        }

        if (e.state === 'Dead') {
            this.setState(UnitState.Dead);
        }

        // update info
        if (e['health'] !== undefined) {
            this.healthBar.updateGame(e.health);
        }
    }

    private playAnimation(animation: Animations) {
        if (this.previousAnimation !== animation) {
            const action = this.animations.get(animation)!;
            action.reset();
            const previousAction = this.animations.get(this.previousAnimation)!;
            previousAction.crossFadeTo(action, .2, false).play();
            this.previousAnimation = animation;
        }
    }

    private smoothLookAt(model: Object3D, target: Vector3, timeMs: number) {
        const mock = new Object3D();
        mock.position.set(model.position.x,model.position.y, model.position.z );
        mock.lookAt(target);
        new TWEEN.Tween({t:0})
            .to({t:1}, timeMs)
            .onUpdate((tween)=>model.quaternion.slerp(mock.quaternion, tween.t))
            .start();
    }

    public setState(state: UnitState) {
        this.state = state;
        if (this.state === UnitState.Dead) {
            this.healthBar.remove();
            setTimeout(()=>this.unit.parent?.remove(this.unit), 500);
        }
        switch (this.state) {
            case UnitState.Moving: 
                this.playAnimation(Animations.Walk);
                break;
            case UnitState.Idle: 
                this.playAnimation(Animations.Idle);
                break;
            
            case UnitState.Attacking: 
                this.playAnimation(Animations.Attack);
                break;

            case UnitState.Dead: 
                this.playAnimation(Animations.Die);
                break;
        }
    }

    public setMovementTarget(targetBoardPosition: Vector2) {
        if (this.movementTarget !== undefined) {
            // this.model.position.lerp(new Vector3(this.movementTarget.x, this.movementTarget.y, this.movementTarget.z), .1);
        }
        this.movementTarget = boardCoordinatesTo3D(targetBoardPosition);
    }
    public stopMoving() {
        if (this.movementTarget !== undefined) {
            this.unit.position.lerp(new Vector3(this.movementTarget.x, this.movementTarget.y, this.movementTarget.z), .1);
            this.movementTarget = undefined;
        }
    }

    public getRaycasterIntersection(raycaster: Raycaster): Intersection[] {
        if (this.state === UnitState.Dead) {
            return [];
        } else {
            return raycaster.intersectObject(this.dragBox, false);
        }
    }
}
export default Entity