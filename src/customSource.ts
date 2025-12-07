import * as THREE from 'three'
import { OverscaledTileID } from 'maplibre-gl'
import {CustomSource,DataTileInfo,LatLon,ObjectInfo,Model} from "./interface_class"
import {tileLocalToLatLon, getMetersPerExtentUnit} from "./convert/map_convert"
import {requestVectorTile} from "./tile/request"
import {parseVectorTile} from "./convert/vectortile_convert"
import {parseTileInfo} from "./tile/tile"
import { LRUCache } from 'lru-cache'
import { downloadModel, downloadTexture} from './model/objModel'    
import { CanonicalTileID } from 'maplibre-gl';
import { Box3 } from 'three'
import { VectorTile } from '@mapbox/vector-tile'
export class customSource implements CustomSource {
    id = 'map-4d';
    //hard code
    url = 'https://tile.map4d.vn/tile/vector/{z}/{x}/{y}?key={key}'; 
    //hard code 
    key = '208e1c99aa440d8bc2847aafa3bc0669'; 
    modelCache : LRUCache<string,Model> = new LRUCache<string,Model>({ max : 1000 , dispose : this.obObject3dDispose }); 
    tileCache : LRUCache<string,DataTileInfo> = new LRUCache<string,DataTileInfo>({max : 500 , dispose : this.onTileDispose });  
    constructor(){
    }

    onTileDispose(dataTile : DataTileInfo, key : string) : void{
        if(dataTile.stateDownload === 'downloading')
            dataTile.stateDownload = 'disposed';
    }

    obObject3dDispose(model : Model, key : string) : void{
        if(model.stateDownload === 'downloading')
            model.stateDownload = 'disposed';
    }

    onTileRequest(overScaledTile : OverscaledTileID) : void {
        const tile : CanonicalTileID = overScaledTile.canonical;
        const x : number = tile.x; 
        const y : number = tile.y; 
        const z : number = tile.z; 
        let dataTileInfo : DataTileInfo = {};
        dataTileInfo.state = 'prearing'; 
        dataTileInfo.stateDownload = 'downloading';
        this.tileCache?.set(tile.toString(),dataTileInfo); 
        requestVectorTile(z,x,y,this.key,this.url)
        .then((buffer : ArrayBuffer) => {
            if(dataTileInfo.stateDownload === 'disposed')
            {
                return; 
            }
            const parsedTile : VectorTile = parseVectorTile(buffer);
            if(Object.keys(parsedTile.layers).includes('objects'))
            {
                const objects:Array<ObjectInfo> = parseTileInfo(parsedTile);
                dataTileInfo.objects = objects; 
                dataTileInfo.overScaledTileID = overScaledTile;  
                dataTileInfo.state = 'loaded'; 
                dataTileInfo.stateDownload = 'loaded';
                dataTileInfo.sceneTile = new THREE.Scene();     
            }
            else 
            {
                dataTileInfo.state = 'not-support'; 
            }
        })
        .catch(err => {
            console.error(err); 
        }); 
    }

    onModelRequest(tileData : DataTileInfo) : void{
        tileData.objects?.forEach((object : ObjectInfo) => {
            const modelName : string = object.modelName as string; 
            if(!this.modelCache?.has(modelName))
            {
                let model : Model = {};
                model.stateDownload = 'downloading';
                model.object3d = new THREE.Group();
                this.modelCache?.set(modelName, model);
                const modelUrl : string = object.modelUrl as string; 
                const textureUrl : string = object.textureUrl as string; 
                downloadModel(modelUrl).then(async (object3d : THREE.Group) => {
                    if(model.stateDownload === 'disposed')
                    {
                        return; 
                    }
                    const textureLoader : THREE.TextureLoader = new THREE.TextureLoader();
                    const texture : THREE.Texture = await textureLoader.loadAsync(textureUrl);
                    object3d.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.material.map = texture;
                            child.material.needsUpdate = true;
                        }
                    });
                    model.stateDownload = 'loaded';
                    model.object3d = object3d;
                })
                .catch((err) => {
                    console.error(err);
                });
            } 
        });
    }

    onRequest(tiles : Array<OverscaledTileID>) : Array<DataTileInfo> {
        let resultTiles : Array<DataTileInfo> = [];
        tiles.forEach((overScaledTile, index) => {
            const tile : CanonicalTileID = overScaledTile.canonical;
            const tileKey : string = tile.toString();
            if(!this.tileCache?.has(tileKey))
            {
                this?.onTileRequest(overScaledTile);    
            }
            else 
            {
                const tileData : DataTileInfo | undefined = this.tileCache?.get(tileKey); 
                if(tileData && tileData.state === 'loaded')
                {
                    //trigger download model
                    this.onModelRequest(tileData); 
                    //add tile to scene 
                    if(tileData.sceneTile?.children.length !== tileData.objects?.length)
                    {
                        tileData.objects?.forEach((object : ObjectInfo, objIndex) => {
                            const modelName : string = object.modelName as string;  
                            const modelId : string = object.id as string;
                            if(this.modelCache?.has(modelName) && this.modelCache?.get(modelName)?.stateDownload === 'loaded' )
                            {
                                const obj3d : THREE.Group | undefined = this.modelCache?.get(modelName)?.object3d;  
                                if(obj3d && tileData.sceneTile && tileData.sceneTile?.getObjectByName(modelId) === undefined)
                                {
                                    const z : number = tileData.overScaledTileID!.canonical.z; 
                                    const tileX : number = tileData.overScaledTileID!.canonical.x;
                                    const tileY : number = tileData.overScaledTileID!.canonical.y;
                                    const latlon : LatLon = tileLocalToLatLon(z, tileX, tileY, object.localCoordX as number , object.localCoordY as number);
                                    const scaleUnit : number = getMetersPerExtentUnit(latlon.lat, z);
                                    const bearing : number = object.bearing as number;
                                    const objectScale : number = object.scale as number;
                                    const cloneObj3d : THREE.Group = obj3d.clone(true);
                                    cloneObj3d.name = modelId; 
                                    cloneObj3d.position.set(object.localCoordX as number,object.localCoordY as number,0);
                                    cloneObj3d.scale.set(scaleUnit * objectScale, -scaleUnit * objectScale, 1.0 * objectScale);
                                    cloneObj3d.rotation.z = - bearing * Math.PI / 180.0;
                                    cloneObj3d.updateMatrix(); 
                                    cloneObj3d.updateMatrixWorld(true);
                                    cloneObj3d.updateMatrixWorld(true);
                                    cloneObj3d.matrixAutoUpdate = false; 
                                    tileData.sceneTile.add(cloneObj3d);
                                }
                            }
                        });
                    }
                    if(tileData.stateDownload === 'loaded' && tileData.state === 'loaded')
                    {
                        resultTiles.push(tileData);
                    }
                }
            }
        });
        return resultTiles;
    } 
}