import maplibregl, {
    //Map,
    OverscaledTileID,
    CustomLayerInterface,
    CustomRenderMethodInput,
} from 'maplibre-gl';
import type {LatLon} from './interface_class';
import {createLightGroup, createYupToZUpMatrix, decomposeObject, prepareModelForRender} from './model/objModel';
import {tileLocalToLatLon, getMetersPerExtentUnit, latlonToLocal, clampZoom} from './convert/map_convert';
import * as THREE from 'three';
import {OutlineLayerOptions} from "./gizmo/OutlineLayer";
import {Object3D} from "three";
import {MaplibreShadowMesh} from "./shadow/ShadowGeometry";

export type EditorLayerOpts = {
    id: string;
    applyGlobeMatrix: boolean;
    editorLevel: number;
}

export type ObjectDefine = {
    id: string;
    object3d: THREE.Object3D;
}

export type ObjectInfoForEditorLayer = {
    id: string;
    name: string;
    object3d: any;
    textureUrl: string;
    textureName: string;
    modelName: string;
    modelUrl: string;
}
export type DataTileInfoForEditorLayer = {
    objects: Array<ObjectInfoForEditorLayer>;
    //overScaledTileID : OverscaledTileID;
    sceneTile: THREE.Scene;
}

type RenderTile = {
    overScaledTileID : OverscaledTileID;
    tileInfo : DataTileInfoForEditorLayer;
}

export class EditLayer implements CustomLayerInterface {
    id: string;
    editorLevel: number = 16;
    type: 'custom' = 'custom';
    renderingMode: '3d' = '3d';
    tileSize : number = 512;
    private map: maplibregl.Map | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private camera: THREE.Camera | null = null;
    private visible = true;
    private raycaster = new THREE.Raycaster();
    private modelCache: Map<string, THREE.Object3D> = new Map();
    private tileCache: Map<string, DataTileInfoForEditorLayer> = new Map();
    private applyGlobeMatrix: boolean | false = false;
    private onPick?: (info: any) => void;
    private onPickfail?: (info: any) => void;


    constructor(opts: EditorLayerOpts & { onPick?: (info: any) => void } & { onPickfail?: (info: any) => void }) {
        this.id = opts.id;
        this.editorLevel = opts.editorLevel;
        this.applyGlobeMatrix = opts.applyGlobeMatrix;
        this.onPick = opts.onPick;
        this.onPickfail = opts.onPickfail;
    }

    onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): void {
        this.map = map;
        this.camera = new THREE.Camera();
        this.camera.matrixAutoUpdate = false;
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
        });
        this.renderer.autoClear = false;
        map.on('click', this.handleClick);
    }

    onRemove(): void {
        this.renderer?.dispose();
        this.renderer = null;
        this.camera = null;
        this.map = null;
    }

    private tileKey(x: number, y: number, z: number): string {
        return `${z}/${x}/${y}`;
    }

    addObjectsToCache(objects: ObjectDefine[]): void {
        for (const obj of objects) {
            const id = obj.id;
            const obj3d = obj.object3d;
            if (!this.modelCache.has(id)) {
                prepareModelForRender(obj3d as THREE.Object3D, false, false);
                this.modelCache.set(id, obj3d);
            }
        }
    }

    private ensureTiles(tiles : OverscaledTileID[]) : RenderTile[] {
        const result: RenderTile[] = [];
        for (const overScaledTileID of tiles) {
            const canonicalTileID = overScaledTileID.canonical;
            const key = this.tileKey(canonicalTileID.x,canonicalTileID.y,canonicalTileID.z);
            const tileData = this.tileCache.get(key);
            if(tileData){
                result.push({
                    overScaledTileID : overScaledTileID,
                    tileInfo : tileData,
                });
            }
        }
        return result;
    }

    private handleClick = (e: any) => {
        if (!this.map || !this.camera || !this.renderer || !this.visible) {
            return;
        }
        // to NDC [-1..1]
        const canvas = this.map.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((e.point.x) / rect.width) * 2 - 1,
            -(((e.point.y) / rect.height) * 2 - 1),
        );
        // lấy visible tiles + tile entries đã build scene
        const zoom = clampZoom(this.editorLevel, this.editorLevel, Math.round(this.map.getZoom()));
        const visibleTiles = (this.map as any).coveringTiles({
            tileSize: this.tileSize,
            minzoom: zoom,
            maxzoom: zoom,
            roundZoom: true,
        }) as OverscaledTileID[];
        const tr: any = (this.map as any).transform;
        if (!tr?.getProjectionData) {
            return;
        }
        let bestHit: {
            dist: number;
            hit: any;
            tileKey: string;
            overScaledTileID: OverscaledTileID,
            group: THREE.Object3D
        } | null = null;
        for (const tid of visibleTiles) {
            const canonicalID =  tid.canonical;
            const key = this.tileKey(canonicalID.x,canonicalID.y,canonicalID.z);
            const tileData = this.tileCache.get(key);
            if(!tileData) {continue;}
            if (!tileData.sceneTile) {
                continue;
            }

            const proj = tr.getProjectionData({
                overscaledTileID: tid,
                applyGlobeMatrix: this.applyGlobeMatrix,
            });

            // ---- manual ray from MVP inverse ----
            const mvp = new THREE.Matrix4().fromArray(proj.mainMatrix as any);
            const inv = mvp.clone().invert();

            const pNear = new THREE.Vector4(ndc.x, ndc.y, -1, 1).applyMatrix4(inv);
            pNear.multiplyScalar(1 / pNear.w);

            const pFar = new THREE.Vector4(ndc.x, ndc.y, 1, 1).applyMatrix4(inv);
            pFar.multiplyScalar(1 / pFar.w);

            const origin = new THREE.Vector3(pNear.x, pNear.y, pNear.z);
            const direction = new THREE.Vector3(pFar.x, pFar.y, pFar.z).sub(origin).normalize();

            this.raycaster.ray.origin.copy(origin);
            this.raycaster.ray.direction.copy(direction);

            const hits = this.raycaster.intersectObjects(tileData.sceneTile.children, true);
            if (hits.length) {
                const h0 = hits[0];
                let obj: THREE.Object3D | null = h0.object;
                while (obj && !obj.userData?.isModelRoot) {
                    obj = obj.parent as THREE.Object3D;
                }
                console.log(obj?.parent);
                console.log(obj?.parent?.userData);
                if (obj) {
                    if (!bestHit || h0.distance < bestHit.dist) {
                        bestHit = {
                            dist: h0.distance,
                            hit: h0,
                            tileKey: key,
                            overScaledTileID: tid,
                            group: obj
                        };
                    }
                }
            }
        }
        if (!bestHit) {
            if (this.onPickfail) {
                this.onPickfail({});
            }
            this.map.triggerRepaint();
            return;
        }
        const obj: any = bestHit.group;
        const data = obj.userData || obj.parent?.userData;
        this.onPick?.({
            lngLat: e.lngLat,
            point: e.point,
            distance: bestHit.dist,
            tileKey: bestHit.tileKey,
            picked: data, // modelId/modelName/objectInfo/tile...
            three: {
                object: obj,
                faceIndex: bestHit.hit.faceIndex,
                point: bestHit.hit.point,
            },
            overScaledTileId: bestHit.overScaledTileID
        });
        this.map.triggerRepaint();
    };

    private getTileData(key: string): DataTileInfoForEditorLayer {
        let tileData = this.tileCache.get(key);
        if (!tileData) {
            //create new scene for tile
            const scene = new THREE.Scene();
            createLightGroup(scene);
            const objects: Array<ObjectInfoForEditorLayer> = new Array();
            tileData = {
                objects: objects,
                sceneTile: scene,
            }
            this.tileCache.set(key, tileData);
        }
        return tileData;
    }

    addObjectToScene(id: string): void {
        if (!this.map) {
            return;
        }
        const root_obj = this.modelCache.get(id);
        if (!root_obj) return;
        const center = this.map.getCenter();
        const local = latlonToLocal(center.lng, center.lat, this.editorLevel);
        const key = this.tileKey(local.tileX, local.tileY, local.tileZ);
        const tileData = this.getTileData(key);
        const cloneObj3d = root_obj.clone(true);
        //cal scale
        const scaleUnit = getMetersPerExtentUnit(center.lat, this.editorLevel)
        const bearing = 0;
        const objectScale = 1;
        cloneObj3d.name = id;
        cloneObj3d.scale.set(
           scaleUnit * objectScale,
            scaleUnit * objectScale,
            objectScale,
        );
        cloneObj3d.position.set(local.coordX as number,
            local.coordY as number,
            cloneObj3d.position.z);
        cloneObj3d.rotation.z = -THREE.MathUtils.degToRad(bearing);
        cloneObj3d.matrixAutoUpdate = false;
        cloneObj3d.updateMatrix();
        cloneObj3d.updateMatrixWorld(true);
        cloneObj3d.userData = {
            tile: {z : this.editorLevel, x: local.tileX, y: local.tileY},
            isModelRoot : true,
            scaleUnit
        };
        const main_scene = tileData.sceneTile;
        cloneObj3d.traverse((child: any) => {
            if (child?.isMesh) {
                const object_shadow = new MaplibreShadowMesh(child);
                object_shadow.userData = {
                    scale_unit: scaleUnit,
                };
                object_shadow.matrixAutoUpdate = false;
                main_scene.add(object_shadow);
            }
        });
        main_scene.add(cloneObj3d);
        this.map?.triggerRepaint();
    }

    render(gl: WebGLRenderingContext, args: CustomRenderMethodInput): void {
        if (!this.map || !this.camera || !this.renderer || !this.visible) {
            return;
        }
        this.renderer.clearStencil();
        const zoom = clampZoom(this.editorLevel,this.editorLevel,Math.round(this.map.getZoom()));
        const visibleTiles = this.map.coveringTiles({
            tileSize: this.tileSize,
            minzoom: zoom,
            maxzoom: zoom,
            roundZoom: true,
        } as any);
        const renderTiles = this.ensureTiles(visibleTiles);
        const tr: any = (this.map as any).transform;
        if (!tr?.getProjectionData) {
            return;
        }
        for (const tile of renderTiles) {
            if (!tile.overScaledTileID || !tile.tileInfo.sceneTile) {
                continue;
            }
            const projectionData = tr.getProjectionData({
                overscaledTileID: tile.overScaledTileID,
                applyGlobeMatrix: this.applyGlobeMatrix,
            });
            const tileMatrix = projectionData.mainMatrix;
            this.camera.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix);
            this.renderer.resetState();
            //update shadow geo
            //this.updateShadow(tile.sceneTile);
            this.renderer.render(tile.tileInfo.sceneTile, this.camera);
        }
    }

}