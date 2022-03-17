import * as THREE from "three";
import { LineSegments, Material, Mesh, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import { boardCoordinatesTo3D, gridCoordinatesToBoardCoordinates } from "./Utils";

class Board {
    private readonly boardMesh: Mesh;
    private readonly markers: THREE.Group;

    constructor(
        private readonly scene: THREE.Scene, 
        private readonly camera: PerspectiveCamera) {

        this.boardMesh = this.createBoardMesh();
        this.createBoardIsland();

        this.markers = this.createMarkers();

    }

    public update(): void {
    }

    private createBoardMesh(): Mesh {
        const texture = new THREE.TextureLoader().load( "../resources/textures/test2.jpeg" );
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
    private createMarkers(): THREE.Group {
        const texture = new THREE.TextureLoader().load( "../resources/textures/mountain.jpeg" );
        const markers = new THREE.Group();
        const markerRed = new THREE.Mesh(
            new THREE.BoxBufferGeometry(2, 4, 4),
            new THREE.MeshStandardMaterial({
                color: '#ff4747',
            })
        );
        const coordinatesRed = boardCoordinatesTo3D(gridCoordinatesToBoardCoordinates(new Vector2(8,4)));
        markerRed.position.set(coordinatesRed.x, -1, coordinatesRed.z);
        markerRed.castShadow = true;
        markerRed.receiveShadow = true;
        markers.add(markerRed);

        const markerBlue = new THREE.Mesh(
            new THREE.BoxBufferGeometry(2, 4, 4),
            new THREE.MeshStandardMaterial({
                color: '#5999ff',
            })
        );
        const coordinatesBlue = boardCoordinatesTo3D(gridCoordinatesToBoardCoordinates(new Vector2(8,3)));
        markerBlue.position.set(coordinatesBlue.x, -1, coordinatesBlue.z);
        markerBlue.castShadow = true;
        markerBlue.receiveShadow = true;
        markers.add(markerBlue)

        const markerCenter = new THREE.Mesh(
            new THREE.BoxBufferGeometry(40, 1, 1),
            new THREE.MeshStandardMaterial({
                map: texture,
            })
        );
        const coordinatesCenter = boardCoordinatesTo3D(gridCoordinatesToBoardCoordinates(new Vector2(3.5,3.5)));
        markerCenter.position.set(coordinatesCenter.x, 0, coordinatesCenter.z);
        markerCenter.castShadow = true;
        markerCenter.receiveShadow = true;
        markers.add(markerCenter)

        this.scene.add(markers);
        return markers
    }

    private createBoardIsland(): Mesh {
        const texture = new THREE.TextureLoader().load( "../resources/textures/mountain.jpeg" );
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
}

export default Board