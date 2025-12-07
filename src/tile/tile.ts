import {VectorTile} from '@mapbox/vector-tile';
import {DataTileInfo,ObjectInfo} from "../interface_class"
export function parseTileInfo(tile : VectorTile) : Array<ObjectInfo> {
    const layer = tile.layers['objects'];
    const extent = layer.extent;
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
        const geometries = feature.loadGeometry();
        const pt = geometries[0][0];
        object3d.localCoordX = pt.x * (8192 / extent); 
        object3d.localCoordY = pt.y * (8192 / extent); 
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