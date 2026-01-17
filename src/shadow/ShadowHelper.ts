import * as THREE from 'three';
import {reverseFaceWinding} from "../model/objModel";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function createSunLightArrow(dir: THREE.Vector3, scaleUnit: number): THREE.ArrowHelper {
    const origin = new THREE.Vector3(4096, 4096, 0);
    const length = 3000;
    const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(dir.x, dir.y, 0).normalize(),       // hướng
        new THREE.Vector3(4096, 4096, 0),    // điểm gốc
        length,    // độ dài
        0xff0000,  // màu,
        400,
        400
    );
    arrow.traverse(child => {
        if (child instanceof THREE.Mesh) {
            if (child.material) {
                child.material.depthTest = false;
                child.material.depthWrite = false;
            }
        }
    });
    arrow.position.z = 50;
    arrow.scale.set(1, -1, 1 / scaleUnit);
    return arrow;
}

/*Tính hướng của ánh sáng mặt trời với azimuth và altitude*/
export function calculateSunDirectionMaplibre(altitude: number /*radian*/, azimuth: number /*radian*/): THREE.Vector3 {
    let oaz_dir = new THREE.Vector3(0, -1, 0);
    oaz_dir.x = -Math.sin(azimuth) * Math.cos(altitude);
    oaz_dir.y = Math.cos(azimuth) * Math.cos(altitude);
    oaz_dir.z = Math.sin(altitude);
    return oaz_dir.normalize();
}
