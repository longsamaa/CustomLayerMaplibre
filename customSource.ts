import maplibregl from 'maplibre-gl'
import * as THREE from 'three'
import {CustomSource,DataTileInfo,ObjectInfo,TileMatrixData} from "./interface_class"
import {requestVectorTile,buildURL} from "./request/request"
import {parseVectorTile, getLayerFeatures} from "./convert/vectortile_convert"
import {parseTileInfo} from "./tile/tile"
import { LRUCache } from 'lru-cache'
import { CanonicalTileID } from 'maplibre-gl';
import { buffer } from "stream/consumers";
export class customSource implements CustomSource {
    id = 'map-4d';
    //hard code
    url = 'https://tile.map4d.vn/tile/vector/{z}/{x}/{y}?key={key}'; 
    //hard code 
    key = '208e1c99aa440d8bc2847aafa3bc0669'; 
    objCache : LRUCache<string,THREE.Group> = new LRUCache<string,THREE.Group>({ max : 200 , disposeAfter : this.obObject3dDispose }); 
    tileCache : LRUCache<string,DataTileInfo> = new LRUCache<string,DataTileInfo>({max : 200 , disposeAfter : this.onTileDispose });  
    constructor(){
    }

    onTileDispose(value : DataTileInfo, key : string) : void{
        console.log(key); 
        console.log(value); 
    }

    obObject3dDispose(value : THREE.Group, key : string) : void{

    }

    onTileRequest(tile : CanonicalTileID) : void {
        const x : number = tile.x; 
        const y : number = tile.y; 
        const z : number = tile.z; 
        let dataTileInfo : DataTileInfo = {};
        dataTileInfo.state = 'prearing'; 
        this.tileCache?.set(tile.toString(),dataTileInfo); 
        requestVectorTile(z,x,y,this.key,this.url)
        .then((buffer) => {
            const parsedTile = parseVectorTile(buffer);
            if(Object.keys(parsedTile.layers).includes('objects'))
            {
                const objects:Array<ObjectInfo> = parseTileInfo(parsedTile);
                dataTileInfo.objects = objects; 
                dataTileInfo.canonicalID = tile;  
                dataTileInfo.state = 'loaded'; 
            }
            else 
            {
                dataTileInfo.state = 'not-support'; 
            }
            console.log(`size : ${this.tileCache?.size}`); 
        })
        .catch(err => {
            console.error(err); 
        }); 
    }

    onModelRequest(tileData : DataTileInfo) : void{
        tileData.objects?.forEach((object : ObjectInfo) => {
            console.log(object.modelUrl); 
        }); 
    }

    onRequest(tiles : Array<TileMatrixData>) : void {
        //check tile co trong cache chua ??
        tiles.forEach(({ tile, tileMatrix }) => {
            if(!this.tileCache?.has(tile.toString()))
            {
                this?.onTileRequest(tile);    
            }
        }); 
        //download model from tile state = true 
        this.tileCache.forEach((tileData : DataTileInfo, key : string) => {
            if(tileData.state === 'loaded'){
                this.onModelRequest(tileData); 
            }
        });
    } 
}