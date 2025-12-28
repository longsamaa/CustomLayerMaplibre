// Use global THREE from CDN
import {OverscaledTileID, Transform} from 'maplibre-gl'
import * as THREE from 'three'
import {MapCustomLayer, DataTileInfo, CustomSource} from "./interface_class"
import {customSource} from "./customSource"
// Define custom layer with Three.js
export class mapCustomLayer implements MapCustomLayer {
    id = 'map-4d'; 
    type : "custom" = "custom";
    renderingMode: '3d' | '2d' | undefined = '3d';
    tileSize = 512; 
    source_ : CustomSource; 
    map : any; 
    camera : any = null; 
    renderer : any = null; 
    minZoom : number = 16;
    maxZoom : number = 19;
    constructor(id_ : string, source : CustomSource)
    {
        this.source_ = source; 
        this.id = id_; 
    }
    updateVisibleTiles(transform : Transform): Array<OverscaledTileID> {
        if (!this.map) {
            return [];
        }
        const zoom : number = Math.round(transform.zoom);
        let currentZoom : number = Math.min(this.maxZoom,zoom);
        currentZoom = Math.max(this.minZoom,currentZoom);
        const tiles : Array<OverscaledTileID> = transform.coveringTiles({
            tileSize: this.tileSize,
            minzoom: currentZoom,
            maxzoom: currentZoom,
            roundZoom: true
        });
        return tiles;
    };

    onAdd(map: any, gl: WebGLRenderingContext): void {
        this.map = map;
        this.camera = new THREE.Camera();
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });
        this.renderer.autoClear = false;
    };

    onTileRequest(tiles: Array<OverscaledTileID>) : Array<DataTileInfo> {
        return this.source_?.onRequest(tiles) || [];
    } 

    onTileRender(tiles : Array<DataTileInfo>, transform : Transform) : void {
        tiles.forEach((tileData : DataTileInfo) => {
            if (!tileData.overScaledTileID) {
                return;
            }
            if (!tileData.sceneTile) {
                return;
            }
            const tileMatrix = transform.calculatePosMatrix(tileData.overScaledTileID.toUnwrapped(), false);
            this.camera.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix);
            this.renderer!.resetState();
            this.renderer!.render(tileData.sceneTile, this.camera);
        });
    }

    render(gl: WebGLRenderingContext): void {
        const tr : Transform = this.map.transform;
        // || this.map.isMoving() || this.map.isRotating() || this.map.isZooming()
        if (!this.updateVisibleTiles || !this.camera || !this.renderer || !this.map) {
            return;
        }
        const renderTiles : Array<OverscaledTileID> = this.updateVisibleTiles(tr);
        const dataTiles : Array<DataTileInfo> = this.onTileRequest(renderTiles);
        this.onTileRender(dataTiles, tr);
        this.map!.triggerRepaint();
    };
};