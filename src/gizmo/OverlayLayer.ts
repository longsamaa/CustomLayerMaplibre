import type {
    Map,
    OverscaledTileID,
    CustomLayerInterface,
    CustomRenderMethodInput,
} from 'maplibre-gl';
import type {LatLon} from '../interface_class';
import {MaplibreTransformControls, HoverParameter} from './MaplibreControl';
import {createYupToZUpMatrix, decomposeObject} from '../model/objModel';
import {TransformControlsMode} from 'three/examples/jsm/controls/TransformControls.js';
import {tileLocalToLatLon, getMetersPerExtentUnit} from '../convert/map_convert';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import * as THREE from 'three';


export type OverlayLayerOptions = {
    id: string;
}

export type TransformSnapshot = {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    quaternion: THREE.Quaternion;
}


export class OverlayLayer implements CustomLayerInterface {
    id: string;
    type: 'custom' = 'custom';
    renderingMode: '3d' = '3d';
    private map: Map | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private scene: THREE.Scene | null = null;
    private transformControl: MaplibreTransformControls | null = null;
    private visible = true;
    private objectTransformSnapShot: TransformSnapshot | null = null;
    private applyGlobeMatrix: boolean | false = false;
    private currentTile: OverscaledTileID | null = null;
    private currentObject: THREE.Object3D | null = null;
    private hoverDiv: HTMLDivElement | null = null;

    constructor(opts: OverlayLayerOptions) {
        this.id = opts.id;
        this.createToolTip();
    }

    setCurrentTileID(overTile: OverscaledTileID): void {
        this.currentTile = overTile;
    }

    unselect(): void {
        if (!this.scene) {
            return;
        }
        this.currentTile = null;
        this.currentObject = null;
        if (this.scene.getObjectByName('TransformControls')) {
            this.scene.remove(this.scene.getObjectByName('TransformControls')!);
        }
    }

    reset(): void {
        if (!this.objectTransformSnapShot || !this.currentObject) return;
        const obj = this.currentObject;
        obj.position.copy(this.objectTransformSnapShot.position);
        obj.scale.copy(this.objectTransformSnapShot.scale);
        obj.quaternion.copy(this.objectTransformSnapShot.quaternion);
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
    }

    showToolTip(parameter: HoverParameter): void {
        if (!this.map || !this.hoverDiv) return;
        const object = parameter.object3D;
        const decompose = decomposeObject(parameter.object3D);
        const canvas = this.map.getCanvas();
        const rect = canvas?.getBoundingClientRect();
        const screenX = (parameter.ndc_x * 0.5 + 0.5) * rect.width + rect.left;
        const screenY = (-parameter.ndc_y * 0.5 + 0.5) * rect.height + rect.top;
        const scale = decompose.scale;
        const bearing = decompose.bearing;
        const tileCoord = decompose.tileCoord;
        const height = decompose.height;
        this.hoverDiv.innerText =
            `Name: ${object.name}
            Id : ${object.id}
            Lat : ${decompose.latlon.lat}
            Lon : ${decompose.latlon.lon}
            Tile Coord : ${tileCoord.x},${tileCoord.y}
            Elevation : ${decompose.elevation}
            Scale : ${scale.scaleX},${scale.scaleY},${scale.scaleZ}
            Bearing : ${bearing}
            Height : ${height}(m)`;
        this.hoverDiv.style.left = `${screenX}px`;
        this.hoverDiv.style.top = `${screenY}px`;
        this.hoverDiv.style.display = 'block';
    }

    hideToolTip(): void {
        if (!this.hoverDiv) return;
        this.hoverDiv.style.display = 'none';
    }


    applyScaleZTransformGizmo(scaleZ: number): void {
        if (!this.transformControl) return;
        (this.transformControl as unknown as THREE.Object3D).traverse((child: any) => {
            if (child.isMesh && child.material) {
                const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, 1 / scaleZ);
                child.geometry.applyMatrix4(scaleMatrix);
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat: any) => {
                        mat.side = THREE.DoubleSide;
                        mat.needsUpdate = true;
                    });
                } else {
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
            }
        });
    }

    attachGizmoToObject(object: THREE.Object3D, mode: TransformControlsMode = 'translate'): void {
        if (!this.currentTile || !this.renderer || !this.camera || !this.scene || !this.map) return;
        if (this.scene.getObjectByName('TransformControls')) {
            this.scene.remove(this.scene.getObjectByName('TransformControls')!);
        }
        this.transformControl?.dispose();
        this.currentObject = object;
        if (!this.currentObject) {
            return;
        }
        this.transformControl = new MaplibreTransformControls(this.camera,
            this.renderer.domElement,
            this.map,
            this.applyGlobeMatrix);
        const obj_x = object.position.x;
        const obj_y = object.position.y;
        const lat_lon: LatLon = tileLocalToLatLon(this.currentTile.canonical.z,
            this.currentTile.canonical.x,
            this.currentTile.canonical.y,
            obj_x,
            obj_y);
        this.transformControl.setSize(2);
        const scaleUnit = getMetersPerExtentUnit(lat_lon.lat, this.currentTile.canonical.z);
        this.applyScaleZTransformGizmo(scaleUnit);
        this.transformControl.attach(object);
        this.objectTransformSnapShot = {
            position: object.position.clone(),
            scale: object.scale.clone(),
            quaternion: object.quaternion.clone()
        }
        if (mode === 'rotate') {
            this.transformControl.showX = false;
            this.transformControl.showY = false;
            this.transformControl.showZ = true;
        }
        this.transformControl.setMode(mode);
        (this.transformControl as unknown as THREE.Object3D).visible = true;
        (this.transformControl as unknown as THREE.Object3D).name = 'TransformControls';
        this.transformControl.setCurrentTile(this.currentTile);
        this.scene.add(this.transformControl as unknown as THREE.Object3D);
        this.transformControl.onHover = (parameter: HoverParameter): void => {
            this.showToolTip(parameter);
        }
        this.transformControl.onNotHover = (): void => {
            this.hideToolTip();
        }
    }

    setMode(mode: TransformControlsMode): void {
        if (!this.transformControl) return;
        this.transformControl.setMode(mode);
        if (mode === 'rotate') {
            this.transformControl.showX = false;
            this.transformControl.showY = false;
        } else {
            this.transformControl.showX = true;
            this.transformControl.showY = true;
            this.transformControl.showZ = true;
        }
        this.map?.triggerRepaint();
    }

    createToolTip(): void {
        this.hoverDiv = document.createElement('div');
        this.hoverDiv.style.position = 'absolute';
        this.hoverDiv.style.pointerEvents = 'none';
        this.hoverDiv.style.padding = '4px 6px';
        this.hoverDiv.style.background = 'rgba(0,0,0,0.7)';
        this.hoverDiv.style.color = 'white';
        this.hoverDiv.style.fontSize = '12px';
        this.hoverDiv.style.borderRadius = '4px';
        this.hoverDiv.style.whiteSpace = 'nowrap';
        this.hoverDiv.style.whiteSpace = 'pre-line';
        this.hoverDiv.style.display = 'none'; // ban đầu ẩn
        document.body.appendChild(this.hoverDiv);
    }

    onAdd(map: Map, gl: WebGLRenderingContext): void {
        this.map = map;
        this.camera = new THREE.PerspectiveCamera();
        this.camera.matrixAutoUpdate = false;
        this.scene = new THREE.Scene;
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
        });
        this.renderer.autoClear = false;
    }

    onRemove(): void {
        this.renderer?.dispose();
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.map = null;
    }

    render(gl: WebGLRenderingContext, args: CustomRenderMethodInput): void {
        if (!this.map || !this.camera || !this.renderer || !this.visible || !this.transformControl) {
            return;
        }
        if (this.currentTile) {
            const tr: any = (this.map as any).transform;
            if (!tr?.getProjectionData) {
                return;
            }
            const projectionData = tr.getProjectionData({
                overscaledTileID: this.currentTile,
                applyGlobeMatrix: this.applyGlobeMatrix,
            });
            const tileMatrix = projectionData.mainMatrix;
            this.camera.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix);
            this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
            this.renderer.resetState();
            if (!this.scene) {
                return;
            }
            this.renderer.render(this.scene, this.camera);
        }
    }

}