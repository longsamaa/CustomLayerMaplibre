import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';


export function createYupToZUpMatrix() : THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.set(
        1, 0,  0, 0,
        0, 0, -1, 0,
        0, 1,  0, 0,
        0, 0,  0, 1
    );
    return matrix;
}   

export function cloneGroupReuse(srcGroup: THREE.Group): THREE.Group {
    const newGroup = new THREE.Group();

    newGroup.position.copy(srcGroup.position);
    newGroup.rotation.copy(srcGroup.rotation);
    newGroup.scale.copy(srcGroup.scale);
    newGroup.matrix.copy(srcGroup.matrix);
    newGroup.matrixAutoUpdate = srcGroup.matrixAutoUpdate;

    srcGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;

            // tạo mesh mới nhưng reuse geometry + material
            const newMesh = new THREE.Mesh(m.geometry, m.material);

            // copy transform
            newMesh.position.copy(m.position);
            newMesh.quaternion.copy(m.quaternion);
            newMesh.scale.copy(m.scale);
            newMesh.matrix.copy(m.matrix);
            newMesh.matrixAutoUpdate = m.matrixAutoUpdate;

            // copy các state khác
            newMesh.castShadow = m.castShadow;
            newMesh.receiveShadow = m.receiveShadow;
            newMesh.visible = m.visible;

            newGroup.add(newMesh);
        }
    });

    return newGroup;
}

export function convertRawObject3DToZUp(group3d: THREE.Group): THREE.Group {
    const mat = createYupToZUpMatrix();
    const material = new THREE.MeshBasicMaterial({ color: 0xC0C0C0, side : THREE.DoubleSide});
    group3d.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.geometry.applyMatrix4(mat);
            child.material = material;
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
        }
    });
    group3d.updateMatrixWorld(true);
    return group3d;
}

export function downloadTexture(url : string) : Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();   
        loader.loadAsync(url).then((texture) => {
            resolve(texture);
        }).catch((err) => {
            reject(err);
        });
    });
}      

export function downloadModel(url : string) : Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        const loader = new OBJLoader(); 
        loader.loadAsync(url).then((object) => {
            const zUpObject = convertRawObject3DToZUp(object);
            resolve(zUpObject);
        }).catch((err) => {
            reject(err);
        }); 
    }                       
    );
}
