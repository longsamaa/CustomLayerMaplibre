// Use global THREE from CDN
import {OverscaledTileID, Transform} from 'maplibre-gl'
import * as THREE from 'three'
import {MapCustomLayer, DataTileInfo} from "./interface_class"
import {customSource} from "./customSource"
// Define custom layer with Three.js
export class mapCustomLayer implements MapCustomLayer {
    id = 'map-4d'; 
    type : "custom" = "custom";
    renderingMode : string = '3d';
    tileSize = 512; 
    source_ : customSource = new customSource();
    map : any; 
    camera : any = null; 
    scene : any = null; 
    renderer : any = null; 

    onAdd(map: any, gl: WebGLRenderingContext): void {
        this.map = map;
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();
        // Create Three.js renderer using MapLibre's GL context
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
        try {
            tiles.forEach((tileData : DataTileInfo, index: number) => {
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
        } catch (error) {
            throw error;
        }
    }

    render(gl: WebGLRenderingContext): void {
        const tr : Transform = this.map.transform;
        if(tr.zoom < 16) return; 
        if (!this.updateVisibleTiles || !this.camera || !this.scene || !this.renderer || !this.map) {
            return;
        }
        try {
            const renderTiles : Array<OverscaledTileID> = this.updateVisibleTiles(tr);
            const dataTiles : Array<DataTileInfo> = this.onTileRequest(renderTiles);
            this.onTileRender(dataTiles, tr);
            this.map!.triggerRepaint();
        } catch (error) {
            throw error;
        }
    };
    
    updateVisibleTiles(transform : Transform): Array<OverscaledTileID> {
        if (!this.map) {
            return [];
        }
        const currentZoom : number = Math.min(19,Math.round(transform.zoom));
        const tiles : Array<OverscaledTileID> = transform.coveringTiles({
            tileSize: this.tileSize,
            minzoom: currentZoom,
            maxzoom: currentZoom,
            roundZoom: true
        });
        return tiles;
    };
};