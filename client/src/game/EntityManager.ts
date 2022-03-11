import * as THREE from "three";
import { AnimationMixer, Vector2 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import Entity from "./Entity";
import GameController from "./GameController";


class EntityManager {
    private mixers: Array<AnimationMixer>;
    private readonly models: Map<UnitTypeWasm, GLTF> = new Map();
    private readonly entities: Map<number, Entity> = new Map();
    private gameController?: GameController;
    public loading: boolean = true;

    constructor(private readonly scene: THREE.Scene,
        private readonly logicUpdatePeriod: number) {
        this.mixers = [];
        const loadingManager = new THREE.LoadingManager();
        loadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
            console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
        };
        
        loadingManager.onLoad = () => {
            console.log( 'Loading complete!');
            this.loading = false;
        };
        
        loadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
            console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
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

    public attachToNewGame(gameController: GameController) {
        this.gameController = gameController;
        this.entities.clear();
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

    public createEntity(id: number, entity: any, unitType: UnitTypeWasm, controller: ControllerWasm): void {
        if (this.gameController !== undefined) {
            if ('health' in entity && 'position' in entity) {
                this.entities.set(id,
                    new Entity(
                        this.scene, 
                        this.gameController,
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
    }
}

export default EntityManager;