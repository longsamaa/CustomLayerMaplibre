declare const THREE: any;
declare const maplibregl: any;
import { LRUCache } from 'lru-cache'
import { CanonicalTileID } from 'maplibre-gl';


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
    tileMatrix: Float32Array;
}

export interface ObjectInfo
{
    id? : string; 
    name? : string; 
    group? : any; // 1 object của map4d là 1 group do có nhiều mesh
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

export interface DataTileInfo
{
    objects? : Array<ObjectInfo>; 
    canonicalID? : CanonicalTileID; 
    state? : string
}

export interface CustomSource {
    id: string;
    url : string; 
    key : string; 
    objCache : LRUCache<string,THREE.Group>; 
    tileCache : LRUCache<string,DataTileInfo>; 
    onRequest : (tiles : Array<TileMatrixData>) => void; 
}

export interface MapCustomLayer {
    id: string;
    type: 'custom';
    source_ : CustomSource; 
    map?: any;
    tile_map : Map<any,any>;
    renderTiles : Array<any>; 
    camera?: any;
    scene?: any;
    renderer?: any;
    onAdd: (map: any, gl: WebGLRenderingContext) => void;
    onTileRequest : (tiles : TileMatrixData[]) => void; 
    onTileRender : (tiles : TileMatrixData[]) => void; 
    render: (gl: WebGLRenderingContext, matrix: Array<number>) => void;
    updateVisibleTiles?: () => TileMatrixData[];
}

