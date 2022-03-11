import * as THREE from "three";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import Board from "./Board";
import Stats from 'three/examples/jsm/libs/stats.module';
import GameController from "./GameController";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import EntityManager from "./EntityManager";

const stats = Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
class Game {
    private readonly renderer: WebGLRenderer;
    private readonly cssRenderer: CSS2DRenderer;
    private readonly scene: Scene;
    private readonly camera: PerspectiveCamera;
    private readonly board: Board;
    private readonly entityManager: EntityManager;
    private gameController?: GameController;
    private simulationStarted: boolean = false;

    private previousRenderFrame: DOMHighResTimeStamp | undefined = undefined; //ms
    private previousLogicFrame: DOMHighResTimeStamp | undefined = undefined; //ms
    private readonly logicUpdatePeriod = 200; //ms

    constructor() {
        
        this.cssRenderer = new CSS2DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0px';

        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.CineonToneMapping;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#ADD8E6');
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        this.createAmbientLight();
        this.createDirectionalLight();
        this.camera = this.createCamera();
        this.board = this.createBoard();

        const controls = new OrbitControls(
            this.camera, this.cssRenderer.domElement);
          controls.target.set(0, 10, 0);
          controls.update();
        this.setupWindow();

        this.entityManager = new EntityManager(this.scene, this.logicUpdatePeriod);

        this.newGame();
        this.loop();
    }

    private loop(): void {
        requestAnimationFrame((t: DOMHighResTimeStamp) => {
            if (this.previousRenderFrame === undefined) {
                this.previousRenderFrame = t;
            } else {
                this.renderer.render(this.scene, this.camera);
                this.cssRenderer.render(this.scene, this.camera);
                this.update(t - this.previousRenderFrame);
                this.previousRenderFrame = t;
            } 

            if (this.previousLogicFrame === undefined) {
                this.previousLogicFrame = t;
            } else if (t - this.previousLogicFrame >= this.logicUpdatePeriod) {
                this.previousLogicFrame = t;
                this.updateGame();
            }

            stats.update();
            this.loop();
        });
    }

    public newGame() {
        this.gameController = new GameController();
        this.entityManager.attachToNewGame(this.gameController);

        setTimeout(()=>{
            // this.placePiece(7, 2, UnitTypeWasm.Wolf, ControllerWasm.Initializer);
            // this.placePiece(3, 2, UnitTypeWasm.Bear, ControllerWasm.Initializer);
            // this.placePiece(6, 2, UnitTypeWasm.Bull, ControllerWasm.Initializer);
            // this.placePiece(0, 7, UnitTypeWasm.Wolf, ControllerWasm.Opponent);
            // this.placePiece(0, 6, UnitTypeWasm.Wolf, ControllerWasm.Opponent);
            // this.placePiece(0, 5, UnitTypeWasm.Bear, ControllerWasm.Opponent);

            this.placePiece(2, 2, UnitTypeWasm.Bull, ControllerWasm.Initializer);
            this.placePiece(3, 2, UnitTypeWasm.Bear, ControllerWasm.Initializer);
            this.placePiece(0, 0, UnitTypeWasm.Bull, ControllerWasm.Initializer);
            this.placePiece(5, 5, UnitTypeWasm.Wolf, ControllerWasm.Opponent);
            this.placePiece(4, 5, UnitTypeWasm.Bear, ControllerWasm.Opponent);
            this.placePiece(7, 5, UnitTypeWasm.Wolf, ControllerWasm.Opponent);

            
            setTimeout(()=>{this.simulationStarted = true;}, 2000);
        }, 4000);
        console.log(this.gameController.getEntities());
    }

    public placePiece(gridX: number, gridY: number, unitType: UnitTypeWasm, controller: ControllerWasm) {
        if (this.gameController !== undefined && this.entityManager !== undefined) {
            const id = this.gameController.placePiece(gridX, gridY, unitType, controller);
            const entity = this.gameController.getEntityById(id);
            console.log(id);
            this.entityManager.createEntity(id, entity, unitType, controller);
        }
    }

    private update(timeElapsed: number): void {
        if (this.board !== undefined) this.board.update();
        if (this.entityManager !== undefined) this.entityManager.update(timeElapsed);
    }

    private updateGame() {
        if (this.simulationStarted && this.gameController !== undefined) {
            this.gameController.step();
            const entities: Array<any> = this.gameController.getEntities().all;
            this.entityManager.updateGame(entities);
        }
    }

    private createAmbientLight(): void {
        const light = new THREE.HemisphereLight(0xffeeb1, 0x080820, 1.7);
        this.scene.add(light);
    }

    private createDirectionalLight(): void {
      const light = new THREE.DirectionalLight(0xfdf3c6, 1.1);
      light.position.set(-10, 500, 10);
      light.target.position.set(0, 0, 0);
      light.castShadow = true;
      light.shadow.bias = -0.001;
      light.shadow.mapSize.width = 4096;
      light.shadow.mapSize.height = 4096;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 1000.0;
      light.shadow.camera.left = 100;
      light.shadow.camera.right = -100;
      light.shadow.camera.top = 100;
      light.shadow.camera.bottom = -100;
      this.scene.add(light);
    }

    private createCamera(): PerspectiveCamera {
        const camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 2000 );
        camera.position.set(0, 50, 45);
        camera.rotation.x = -Math.PI/4;
        this.scene.add(camera);

        return camera;
    }

    private createBoard(): Board {
        return new Board(this.scene, this.camera);
    }

    /**
     * Add listeners to make sure game runs smoothly when window is resized
     */
    private setupWindow(): void {
        const resizeGame = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
            this.cssRenderer.setSize( window.innerWidth, window.innerHeight );
            console.log('resizing');
        }

        let resizeTimeout: NodeJS.Timeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeGame, 150);
        });
    }

    public getCanvasElement(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    public getCSSRendererElement(): HTMLElement {
        return this.cssRenderer.domElement;
    }
}

export default Game;