import { LRUCache } from 'lru-cache'
import * as THREE from 'three'
import { OverscaledTileID } from 'maplibre-gl';

export interface LocalCoordinate {
    tileX : number,
    tileY : number,
    tileZ : number,
    coordX : number,
    coordY : number
}

export interface LatLon{
    lat : number,
    lon : number
}

export interface ObjectInfo
{
    id? : string; 
    name? : string; 
    group? : any; 
    localCoordX? : number; 
    localCoordY? : number; 
    scale? : number; 
    bearing? : number; 
    modelType? : string; 
    textureUrl? : string; 
    textureName? : string; 
    modelName? : string; 
    modelUrl? : string; 
}

export interface Model
{
    object3d? : THREE.Object3D;
    stateDownload? : string;
}

export interface DataTileInfo
{
    objects? : Array<ObjectInfo>; 
    overScaledTileID? : OverscaledTileID;
    state? : string;
    sceneTile? : THREE.Scene;
    stateDownload? : string; 
}

