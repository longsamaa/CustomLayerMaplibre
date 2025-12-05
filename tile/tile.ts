import * as THREE from 'three'
import {VectorTile} from '@mapbox/vector-tile';
import {DataTileInfo,ObjectInfo} from "../interface_class"
export function parseTileInfo(tile : VectorTile) : any {
    const layer = tile.layers['objects'];
    let lstObject3d : Array<ObjectInfo> = new Array<ObjectInfo>(); 
    for (let i = 0; i < layer.length; i++) {
        let object3d : ObjectInfo = {};  
        const feature = layer.feature(i);
        const type = feature.type; 
        if(type != 1)
        {
            continue; 
        }
        const properties = feature.properties; 
        if(properties.modelType !== 'Object')
        {
            continue; 
        }
        const geometry = feature.loadGeometry()[0];
        const pt = geometry[0]; 
        object3d.localCoordX = pt.x; 
        object3d.localCoordY = pt.y; 
        object3d.id = properties.id as string; 
        object3d.bearing = properties.bearing as number;
        object3d.modelName = properties.modelName as string;
        object3d.modelUrl = properties.modelUrl as string;  
        object3d.modelType = properties.modelType as string; 
        object3d.textureName = properties.textureName as string; 
        object3d.textureUrl = properties.textureUrl as string; 
        object3d.scale = properties.scale as number;  
        lstObject3d.push(object3d); 
    }
    return lstObject3d; 
}