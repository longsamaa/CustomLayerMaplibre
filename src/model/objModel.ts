import * as THREE from 'three';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {tileLocalToLatLon} from '../convert/map_convert'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';


export function createYupToZUpMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.set(
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
    );
    return matrix;
}

export function convertRawMeshYupToZup(mesh: THREE.Mesh): void {
    const matrix_y_up_to_z_up: THREE.Matrix4 = createYupToZUpMatrix();
    mesh.geometry.applyMatrix4(matrix_y_up_to_z_up);
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
}

export function downloadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.loadAsync(url).then((texture) => {
            resolve(texture);
        }).catch((err) => {
            reject(err);
        });
    });
}

export function downloadModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
            const loader = new OBJLoader();
            loader.loadAsync(url).then((object) => {
                // const zUpObject = convertRawObject3DToZUp(object);
                resolve(object);
            }).catch((err) => {
                reject(err);
            });
        }
    );
}

export function reverseFaceWinding(geometry: THREE.BufferGeometry): void {
    // geometry.computeVertexNormals();
    const index = geometry.index;
    if (index) {
        const indices = index.array;
        for (let i = 0; i < indices.length; i += 3) {
            const tmp = indices[i];
            indices[i] = indices[i + 2];
            indices[i + 2] = tmp;
        }
        index.needsUpdate = true;
    } else {
        // if index null
        const position = geometry.getAttribute('position');
        if (position) {
            const posArray = position.array;
            const itemSize = position.itemSize; // Thường là 3 (x, y, z)

            // Duyệt qua từng triangle (mỗi 3 vertices)
            for (let i = 0; i < posArray.length; i += itemSize * 3) {
                // Hoán đổi vertex 0 và vertex 2 của mỗi triangle
                for (let j = 0; j < itemSize; j++) {
                    const tmp = posArray[i + j]; // vertex 0
                    posArray[i + j] = posArray[i + itemSize * 2 + j]; // vertex 2
                    posArray[i + itemSize * 2 + j] = tmp;
                }
            }
            position.needsUpdate = true;
        }
        const normal = geometry.getAttribute('normal');
        if (normal) {
            const normArray = normal.array;
            const itemSize = normal.itemSize;

            for (let i = 0; i < normArray.length; i += itemSize * 3) {
                for (let j = 0; j < itemSize; j++) {
                    const tmp = normArray[i + j];
                    normArray[i + j] = normArray[i + itemSize * 2 + j];
                    normArray[i + itemSize * 2 + j] = tmp;
                }
            }
            normal.needsUpdate = true;
        }
        const uv = geometry.getAttribute('uv');
        if (uv) {
            const uvArray = uv.array;
            const itemSize = uv.itemSize; // Thường là 2 (u, v)

            for (let i = 0; i < uvArray.length; i += itemSize * 3) {
                for (let j = 0; j < itemSize; j++) {
                    const tmp = uvArray[i + j];
                    uvArray[i + j] = uvArray[i + itemSize * 2 + j];
                    uvArray[i + itemSize * 2 + j] = tmp;
                }
            }
            uv.needsUpdate = true;
        }
    }
    /*geometry.computeVertexNormals();*/
    /*geometry.normalizeNormals();*/
}

export function prepareModelForRender(model: THREE.Object3D, hasShadow: boolean, setDefaultMat: boolean = true): void {
    model.matrixAutoUpdate = false;
    // convert y up to z up
    const default_mat = new THREE.MeshToonMaterial({color: 0xC0C0C0, side: THREE.DoubleSide});
    model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            convertRawMeshYupToZup(child as THREE.Mesh);
            //reverse face winding
            reverseFaceWinding(child.geometry);
            if (setDefaultMat) {
                (child as THREE.Mesh).material = default_mat;
            }
            else {
                const mat = (child as THREE.Mesh).material;
                if (Array.isArray(mat)) {
                    for (const m of mat) {
                        m.side = THREE.DoubleSide;
                    }
                } else {
                    mat.side = THREE.DoubleSide;
                }
            }
        }
    });
}

export async function loadModelFromGlb(url: string): Promise<THREE.Object3D> {
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync(url);
        const obj = gltf.scene as THREE.Object3D;
        console.log(gltf);
        // optional – disable auto update cho editor/map
        return obj;
    } catch (err) {
        console.error(`[loadModelFromGlb] failed to load`, url, err);
        throw err;
    }
}

/*export function prepareModelForEditor() : void {

}*/


export function obj3dReviceShadow(model: THREE.Object3D): void {
    model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false;
        }
    });
}

export function decomposeObject(model: THREE.Object3D): any {
    if (!model.userData) return {};
    const userData = model.userData;
    console.log('user data');
    console.log(userData);
    const scaleUnit = userData.scaleUnit;
    const localPos = model.position;
    const tile = userData.tile;
    const latlon = tileLocalToLatLon(tile.z, tile.x, tile.y, localPos.x, localPos.y);
    const scaleX = model.scale.x / scaleUnit;
    //Them dau - do phai lat Y
    const scaleY = -model.scale.y / scaleUnit;
    const scaleZ = model.scale.z;
    //rotate bearing
    const rad_bearing = model.rotation.z * -1;
    const bearing = THREE.MathUtils.radToDeg(rad_bearing);
    const box = new THREE.Box3();
    box.setFromObject(model);
    const min = box.min;
    const max = box.max;
    const height = max.z - min.z;
    return {
        latlon,
        tileCoord: localPos,
        elevation: model.position.z,
        scale: {scaleX, scaleY, scaleZ},
        bearing: bearing,
        height: height,
    };
}

/*CREATE LIGHT GROUP DIRECTION LIGHT, HEMILIGHT*/
export function createLightGroup(scene: THREE.Scene): void {
    const light_group = new THREE.Group();
    light_group.name = 'light_group';
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.name = 'dir_light';
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.name = "dir_light";
    dirLight.target.position.set(4096, 4096, 0);
    light_group.add(dirLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    hemiLight.name = 'hemi_light';
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 0, -1);
    light_group.add(hemiLight);
    scene.add(light_group);
}


