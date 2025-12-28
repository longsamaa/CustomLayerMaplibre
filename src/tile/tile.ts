import {VectorTile} from '@mapbox/vector-tile';
import {DataTileInfo,ObjectInfo} from "../interface_class"
export function parseTileInfo(tile : VectorTile, sourceLayer : string) : Array<ObjectInfo> {
    const layer = tile.layers[sourceLayer];
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
        const geometries = feature.loadGeometry();
        const pt = geometries[0][0];
        object3d.localCoordX = pt.x * (8192 / extent); 
        object3d.localCoordY = pt.y * (8192 / extent); 
        object3d.id = properties.id as string; 
        object3d.bearing = properties.bearing as number;
        object3d.modelName = properties.modelname as string;
        object3d.modelUrl = properties.modelurl as string;  
        object3d.modelType = properties.modeltype as string; 
        object3d.textureName = properties.texturename as string; 
        object3d.textureUrl = properties.textureurl as string; 
        object3d.scale = properties.scale as number;
        // Only push if all required properties exist
        if (object3d.modelName && object3d.modelUrl && object3d.modelType && 
            object3d.textureName && object3d.textureUrl) {
            lstObject3d.push(object3d);
        } 
    }
    return lstObject3d; 
}