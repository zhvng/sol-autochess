import * as THREE from "three";
import { LineSegments, Material, Mesh, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import GameController from "./GameController";

class Board {
    private readonly boardMesh: Mesh;
    private readonly boardGrid: LineSegments;
    private readonly interactiveBoardPlane: Mesh;
    private mouse?: Vector2;
    private readonly raycaster: Raycaster;

    constructor(
        private readonly scene: THREE.Scene, 
        private readonly camera: PerspectiveCamera) {

        this.raycaster = new THREE.Raycaster(this.camera.position);
        this.boardGrid = this.createBoardGrid();
        this.boardMesh = this.createBoardMesh();
        this.interactiveBoardPlane = this.createInteractiveBoardPlane();
        this.createBoardIsland();
        this.mouse = new Vector2(1,1);

        window.addEventListener('mousemove', (event: MouseEvent)=>{
            this.mousemove(event);
        });
        window.addEventListener('mouseup', (event: MouseEvent)=>{
            this.mouseup(event);
        });
    }

    public update(): void {
    	const intersects = this.raycaster.intersectObject(this.interactiveBoardPlane, false);
    	if (intersects.length > 0) {
            this.boardGrid.position.lerp(new Vector3(0, 1, 0), .5);
            (this.boardGrid.material as Material).visible = true;
    	} else {
            this.boardGrid.position.set(0, 0, 0);
    	    (this.boardGrid.material as Material).visible = false;
        }
    }

    public mousemove(event: MouseEvent){
        if (this.mouse === undefined) {
            this.mouse = new Vector2(1, 1);
        }
    	this.mouse.setX(event.clientX / window.innerWidth * 2 - 1);
    	this.mouse.setY(- event.clientY / window.innerHeight * 2 + 1);

        this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    public mouseup(event: MouseEvent){
        const intersect: Array<THREE.Intersection> = this.raycaster.intersectObject(this.interactiveBoardPlane, false);
        if (intersect.length === 1) {
            const point: Vector3 = intersect[0].point;
            const x = point.x;
            const z = point.z;

            const boardX = Math.round((x + 20) * 20);
            const boardY = Math.round((-z + 20) * 20);
            console.log(boardX, boardY);

            const gridX = Math.round((boardX - 50) / 100);
            const gridY = Math.round((boardY - 50) / 100);
            console.log(gridX, gridY);

        }
    }

    private createBoardMesh(): Mesh {
        const texture = new THREE.TextureLoader().load( "resources/skybox/test2.jpeg" );
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set( 0, 0 );
        texture.repeat.set( 2, 2 );
        const plane = new THREE.Mesh(
            new THREE.BoxBufferGeometry(40, 40, 40, 8, 8),
            new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.DoubleSide,
            })
        );
        plane.position.y = -20;
        plane.castShadow = true;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);
        return plane
    }
    private createInteractiveBoardPlane(): Mesh {
        const plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(40, 40, 8, 8),
            new THREE.MeshStandardMaterial({
                visible: false,
            })
        );
        plane.position.y = 0;
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);
        return plane
    }
    private createBoardIsland(): Mesh {
        const texture = new THREE.TextureLoader().load( "resources/skybox/mountain.jpeg" );
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set( 0, 0 );
        texture.repeat.set( 1, 1 );
        const plane = new THREE.Mesh(
            new THREE.BoxBufferGeometry(50, 50, 35, 8, 8),
            new THREE.MeshToonMaterial({
                map: texture,
                side: THREE.DoubleSide,
            })
        );
        plane.receiveShadow = true;

        plane.position.y = -20;
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);
        return plane
    }

    private createBoardGrid(): LineSegments {
        const grid = new THREE.LineSegments(
            this.GridBoxGeometry(new THREE.BoxBufferGeometry(40, 40, 0, 8, 8), false),
            new THREE.LineBasicMaterial({
                color: 'white',
                visible: true,
            })  
        );
        grid.position.set(0,1,0);
        grid.castShadow = false;
        grid.receiveShadow = true;
        grid.rotation.x = -Math.PI / 2;
        this.scene.add(grid);
        return grid;
    }

    public GridBoxGeometry(geometry: THREE.BoxBufferGeometry, independent: boolean) {
        independent = independent !== undefined ? independent : false;
    
        let newGeometry = new THREE.BoxBufferGeometry();
        let position = geometry.attributes.position;
        newGeometry.attributes.position = independent === false ? position : position.clone();
    
        let segmentsX = geometry.parameters.widthSegments || 1;
        let segmentsY = geometry.parameters.heightSegments || 1;
        let segmentsZ = geometry.parameters.depthSegments || 1;
    
        let startIndex = 0;
        let indexSide1 = indexSide(segmentsZ, segmentsY, startIndex);
        startIndex += (segmentsZ + 1) * (segmentsY + 1);
        let indexSide2 = indexSide(segmentsZ, segmentsY, startIndex);
        startIndex += (segmentsZ + 1) * (segmentsY + 1);
        let indexSide3 = indexSide(segmentsX, segmentsZ, startIndex);
        startIndex += (segmentsX + 1) * (segmentsZ + 1);
        let indexSide4 = indexSide(segmentsX, segmentsZ, startIndex);
        startIndex += (segmentsX + 1) * (segmentsZ + 1);
        let indexSide5 = indexSide(segmentsX, segmentsY, startIndex);
        startIndex += (segmentsX + 1) * (segmentsY + 1);
        let indexSide6 = indexSide(segmentsX, segmentsY, startIndex);
    
        let fullIndices: number[] = [];
        fullIndices = fullIndices.concat(indexSide1);
        fullIndices = fullIndices.concat(indexSide2);
        fullIndices = fullIndices.concat(indexSide3);
        fullIndices = fullIndices.concat(indexSide4);
        fullIndices = fullIndices.concat(indexSide5);
        fullIndices = fullIndices.concat(indexSide6);
    
        newGeometry.setIndex(fullIndices);
    
        function indexSide(x: number, y:number, shift: number) {
          let indices = [];
          for (let i = 0; i < y + 1; i++) {
            let index11 = 0;
            let index12 = 0;
            for (let j = 0; j < x; j++) {
              index11 = (x + 1) * i + j;
              index12 = index11 + 1;
              let index21 = index11;
              let index22 = index11 + (x + 1);
              indices.push(shift + index11, shift + index12);
              if (index22 < ((x + 1) * (y + 1) - 1)) {
                indices.push(shift + index21, shift + index22);
              }
            }
            if ((index12 + x + 1) <= ((x + 1) * (y + 1) - 1)) {
              indices.push(shift + index12, shift + index12 + x + 1);
            }
          }
          return indices;
        }
        return newGeometry;
    };
}

export default Board