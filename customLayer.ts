// Use global THREE from CDN
import maplibregl from 'maplibre-gl'
import * as THREE from 'three'
import { url } from "inspector";
import {MapCustomLayer,TileMatrixData,CustomSource} from "./interface_class"
import {customSource} from "./customSource"
import {tileLocalToLatLon, latlonToLocal, getMetersPerExtentUnit} from "./convert/map_convert"
import {LatLon} from "./interface_class"

// Define custom layer with Three.js
export class mapCustomLayer implements MapCustomLayer {
    id = 'map-4d'; 
    type : "custom" = "custom";
    tileSize = 512; 
    source_ : customSource = new customSource();
    tile_map : Map<any,any> = new Map(); 
    renderTiles: Array<TileMatrixData> = new Array(); 
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

    onTileRequest(tiles: TileMatrixData[]) : void {
        this.source_?.onRequest(tiles); 
    } 

    onTileRender(tiles: TileMatrixData[]) : void {
          this.renderTiles.forEach(({ tile, tileMatrix }) => {
            // Clear scene for this tile
            this.scene!.clear();
            const canonicalID = tile; 
            const test : LatLon = tileLocalToLatLon(canonicalID.z,
                canonicalID.x,
                canonicalID.y, 
                4096,
                4096
            ); 
            const metersPerPixel = getMetersPerExtentUnit(test.lat,canonicalID.z); 
            this.camera!.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix); 
            this.renderer!.state.reset();
            this.renderer!.render(this.scene!, this.camera!);
        });
    }

    render(gl: WebGLRenderingContext): void {
        if (!this.updateVisibleTiles || !this.camera || !this.scene || !this.renderer || !this.map) {
            return;
        }
        this.renderTiles = this.updateVisibleTiles();
        this.onTileRequest(this.renderTiles); 
        this.onTileRender(this.renderTiles); 


        const transform = this.map.transform;
        const currentZoom = Math.floor(transform.zoom);
        // Render for each tile with objects positioned in tile space (0-8192)
      
        this.renderTiles = []; 
        this.map!.triggerRepaint();
    };
    
    updateVisibleTiles(): TileMatrixData[] {
        if (!this.map) {
            return [];
        }

        const transform = this.map.transform;
        const painter = (this.map as any).painter; 
        const currentZoom = Math.floor(transform.zoom);
        
        // Get covering tiles at current zoom
        const tiles = transform.coveringTiles({
            tileSize: this.tileSize,
            minzoom: currentZoom,
            maxzoom: currentZoom,
            roundZoom: true
        });
        // Create array of tile matrices
        const tileMatrices: TileMatrixData[] = tiles.map((tile: any) => {
            const tileMatrix = painter.transform.calculatePosMatrix(tile.toUnwrapped());
            return {
                tile: tile.canonical,
                tileMatrix: tileMatrix
            };
        });
        return tileMatrices;
    };
};