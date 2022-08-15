import * as THREE from "three";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import Board from "./Board";
import Stats from 'three/examples/jsm/libs/stats.module';
import WasmController from "./WasmController";
import { ControllerWasm, UnitTypeWasm } from "wasm-client";
import EntityManager from "./EntityManager";
import { PublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Program } from "@project-serum/anchor";
import { GameInputs } from "utils/gameInputs";
import ContractController from "./ContractController";
import { GameProgress } from "./Utils";
import PiecePlacementManager from "./PiecePlacementManager";
import { UIController } from "pages/play/[id]";

// const stats = Stats();
// stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );
class Game {
    private readonly renderer: WebGLRenderer;
    private readonly cssRenderer: CSS2DRenderer;
    private readonly scene: Scene;
    private readonly camera: PerspectiveCamera;
    private readonly board: Board;
    private readonly entityManager: EntityManager;
    private readonly piecePlacementManager: PiecePlacementManager;
    private wasmController?: WasmController;
    private contractController?: ContractController

    private previousRenderFrame: DOMHighResTimeStamp | undefined = undefined; //ms
    private previousLogicFrame: DOMHighResTimeStamp | undefined = undefined; //ms
    private readonly logicUpdatePeriod = 200; //ms

    constructor(
        gamePDAKey: PublicKey, 
        program: Program, 
        gameInputs: GameInputs, 
        private readonly uiController: UIController) {

        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.CineonToneMapping;

        this.cssRenderer = new CSS2DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0px';

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#ADD8E6');
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        this.createAmbientLight();
        this.createDirectionalLight();
        this.camera = this.createCamera();
        this.board = this.createBoard();

        // const controls = new OrbitControls(
        //     this.camera, this.cssRenderer.domElement);
        //   controls.target.set(0, 10, 0);
        //   controls.update();
        this.setupWindow();

        this.entityManager = this.createEntityManager();
        this.piecePlacementManager = this.createPiecePlacementManager(this.entityManager);

        this.newGame(gamePDAKey, program, gameInputs);
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

            // stats.update();
            this.loop();
        });
    }

    public async newGame(gamePDAKey, program, gameInputs) {
        this.wasmController = new WasmController();
        this.entityManager.attachWasmController(this.wasmController);
        this.contractController = await ContractController.createContractController(
            this.scene, 
            this.camera,
            gamePDAKey, 
            program, 
            gameInputs, 
            this.entityManager,
            this.uiController);
        this.piecePlacementManager.attachNewContract(this.contractController);
    }

    private update(timeElapsed: number): void {
        if (this.board !== undefined) this.board.update();
        if (this.entityManager !== undefined) this.entityManager.update(timeElapsed);
        if (this.contractController !== undefined) this.contractController.update();
    }

    private updateGame() {
        if (this.wasmController !== undefined && this.contractController !== undefined) {
            if (this.entityManager.simulationStarted) {
                this.entityManager.updateGame();
            }
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
        camera.lookAt(0,0,0);
        this.scene.add(camera);

        return camera;
    }

    private createBoard(): Board {
        return new Board(this.scene, this.camera);
    }

    private createEntityManager(): EntityManager {
        return new EntityManager(this.scene, this.logicUpdatePeriod);
    }

    private createPiecePlacementManager(entityManager: EntityManager): PiecePlacementManager {
        return new PiecePlacementManager(this.scene, this.camera, entityManager)
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