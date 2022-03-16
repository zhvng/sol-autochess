import { Bone, Object3D, SkinnedMesh, Vector2, Vector3 } from "three"

export enum GameProgress {
    WaitingForOpponent,
    Reveal1,
    WaitingForOpponentReveal1,
    DrawPieces,
    PlacePieces,
    Reveal2,
    WaitingForOpponentReveal2,
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
        clonedMesh.skeleton = sourceMesh.skeleton.clone();
        clonedMesh.bindMatrix.copy(sourceMesh.bindMatrix);
        clonedMesh.skeleton.bones = sourceBones.map((bone: Bone) => {
            return cloneLookup.get(bone);
        })
        clonedMesh.bind(clonedMesh.skeleton, clonedMesh.bindMatrix);
    });
    return clone;
}