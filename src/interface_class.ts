import { LRUCache } from 'lru-cache'
import { CanonicalTileID, OverscaledTileID, Transform } from 'maplibre-gl';

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

export interface TileMatrixData {
    tile: CanonicalTileID;
    tileMatrix: Float64Array;
    distance?: number; 
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
    object3d? : THREE.Group;
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

export interface CustomSource {
    id: string;
    url : string; 
    root_url : string; 
    key : string; 
    modelCache : LRUCache<string,Model>; 
    tileCache : LRUCache<string,DataTileInfo>; 
    onRequest : (tiles : Array<OverscaledTileID>) => Array<DataTileInfo>; 
}

export interface MapCustomLayer {
    id: string;
    type : 'custom';
    source_? : CustomSource; 
    renderingMode: '3d' | '2d' | undefined;
    map?: any;
    camera?: any;
    renderer?: any;
    onAdd: (map: any, gl: WebGLRenderingContext) => void;
    onTileRequest : (tiles : Array<OverscaledTileID>) => void; 
    onTileRender : (tiles : Array<DataTileInfo>, transform : Transform) => void; 
    render: (gl: WebGLRenderingContext, matrix: Array<number>) => void;
}

