import { Bone, BoxBufferGeometry, Object3D, SkinnedMesh, Vector2, Vector3 } from "three"
import { ControllerWasm, UnitTypeWasm } from "wasm-client";

export enum GameProgress {
    WaitingForOpponent,
    Reveal1,
    WaitingForOpponentReveal1,
    DrawPieces,
    PlacePieces,
    Reveal2,
    WaitingForOpponentReveal2,
    PopulateBoard,
    InProgress,
    End,
    EndTie,
    EndWin,
    EndLose,
}

export enum Animations {
    Walk,
    Attack,
    Die,
    Idle,
}

export enum UnitState {
    Moving,
    Attacking,
    Idle,
    Dead,
}


export const parseUnitTypeFromAnchor = (unitType: any): UnitTypeWasm | 'hidden' => {
    
    if (unitType['wolf'] !== undefined) {
        return UnitTypeWasm.Wolf;
    }
    if (unitType['bear'] !== undefined) {
        return UnitTypeWasm.Bear;
    }
    if (unitType['bull'] !== undefined) {
        return UnitTypeWasm.Bull;
    }
    if (unitType['hidden'] !== undefined) {
        return 'hidden';
    }

    throw new Error('should never get here');
}
export const parseControllerFromAnchor = (controller: any): ControllerWasm => {
    if(controller['initializer'] !== undefined) return ControllerWasm.Initializer;
    if(controller['opponent'] !== undefined) return ControllerWasm.Opponent;
    if(controller['graveyard'] !== undefined) return ControllerWasm.Graveyard;
    if(controller['contract'] !== undefined) return ControllerWasm.Contract;

    throw new Error('should never get here');
}

export const boardCoordinatesTo3D =(boardPosition: Vector2): Vector3 => {
    const x = boardPosition.x / 20 - 20;
    const y = 0;
    const z = 20 - boardPosition.y / 20;
    return new Vector3(x, y, z);
}

export const gridCoordinatesToBoardCoordinates = (gridPosition: Vector2): Vector2 => {
    const x = gridPosition.x * 100 + 50;
    const y = gridPosition.y * 100 + 50;
    return new Vector2(x, y);
}

const parallelTraverse = (a: Object3D, b: Object3D, callback: (a: Object3D, b: Object3D) => void) => {
    callback(a, b);
    for (let i = 0; i < a.children.length; i++) {
        parallelTraverse(a.children[i], b.children[i], callback);
    }
}
    
export const cloneModel = (source: Object3D): Object3D => {
    const sourceLookup = new Map<any, any>();
    const cloneLookup = new Map<any, any>();
    const clone = source.clone();

    parallelTraverse(source, clone, (sourceNode, clonedNode) => {
        sourceLookup.set(clonedNode, sourceNode);
        cloneLookup.set(sourceNode, clonedNode);
    });
    clone.traverse((node) => {
        if (!(node instanceof SkinnedMesh)) {
            return;
        }
        const clonedMesh = node;
        const sourceMesh = sourceLookup.get(node);
        const sourceBones = sourceMesh.skeleton.bones;
        clonedMesh.material = sourceMesh.material.clone();
        clonedMesh.skeleton = sourceMesh.skeleton.clone();
        clonedMesh.bindMatrix.copy(sourceMesh.bindMatrix);
        clonedMesh.skeleton.bones = sourceBones.map((bone: Bone) => {
            return cloneLookup.get(bone);
        })
        clonedMesh.bind(clonedMesh.skeleton, clonedMesh.bindMatrix);
    });
    return clone;
}

export const GridBoxGeometry = (geometry: BoxBufferGeometry, independent: boolean) => {
    independent = independent !== undefined ? independent : false;

    let newGeometry = new BoxBufferGeometry();
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