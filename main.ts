// Use global maplibregl and THREE from CDN
// declare const maplibregl: any;
import maplibregl, { LngLat, OverscaledTileID } from 'maplibre-gl'
import * as THREE from 'three'
import {Map4DModelsThreeLayer} from './src/Layer4DModels'
import {OverlayLayerOptions,OverlayLayer} from './src/gizmo/OverlayLayer'
import OutlineLayer, {OutlineLayerOptions} from './src/gizmo/OutlineLayer'
import {EditLayer,EditorLayerOpts} from './src/EditLayer'
import {loadModelFromGlb} from './src/model/objModel'
// @ts-ignore
import * as SunCalc from 'suncalc';
// Flag to enable/disable proxy

// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: './vbd_style.json',
    center: [106.72140935056187, 10.794890570901666],
    zoom: 16,
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.showTileBoundaries = true;
// Enable tile boundaries
// Add error handler
map.on('error', (e: any) => {
    console.error('Map error:', e);
});

map.on('sourcedataloading', (e: any) => {
    // Handle source data loading
});

map.on('sourcedata', (e: any) => {
    // Handle source data
});


// Once the map is loaded, add vector tile layers

function bindTransformUI(overlay_layer : OverlayLayer) {
    const btnTranslate = document.getElementById("btn-translate");
    const btnRotate = document.getElementById("btn-rotate");
    const btnScale = document.getElementById("btn-scale");
    const btnReset = document.getElementById("btn-reset");

    btnTranslate?.addEventListener("click", () => {
        overlay_layer.setMode('translate');
    });

    btnRotate?.addEventListener("click", () => {
        overlay_layer.setMode('rotate');
    });

    btnScale?.addEventListener("click", () => {
        overlay_layer.setMode('scale');
    });

    btnReset?.addEventListener("click", () => {
        overlay_layer.reset(); 
    });
}

function getSunPosition(lat : number, lon : number) {
    // Lấy thời gian hiện tại (JavaScript Date tự động dùng múi giờ local)
    const now = new Date();
    // Lấy vị trí mặt trời
    const sunPos = SunCalc.getPosition(now, lat, lon);
    return {
        altitude: sunPos.altitude * (180 / Math.PI), // Độ cao (elevation) - chuyển từ radian sang độ
        azimuth: sunPos.azimuth * (180 / Math.PI) + 180, // Góc phương vị - chuyển từ radian sang độ và điều chỉnh (0° = Bắc)
        altitudeRad: sunPos.altitude, // Độ cao (radian)
        azimuthRad: sunPos.azimuth, // Góc phương vị (radian)
        time: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };
}

function addMap4d(map : maplibregl.Map) {
    console.log(map.getCenter());
    const center = map.getCenter();
    const vectorSourceId = "map4d";
    map.addSource(vectorSourceId, {
        type: "vector",
        tiles: [
            "http://10.225.1.11:3000/map4d_3dmodels/{z}/{x}/{y}"
        ],
        minzoom: 16,
        maxzoom: 17
    });


    const opts : OverlayLayerOptions = {
        id : 'overlay',
    }
    const overlay_layer = new OverlayLayer(opts); 
    const sourceLayer = "map4d_3dmodels";
    const sunPos = getSunPosition(center.lat,center.lng);
    const sun_options = {
        shadow : true,
        altitude : sunPos.altitude,
        azimuth : sunPos.azimuth,
    }
    const outline_opts : OutlineLayerOptions = {
        id : 'outline object',
    };
    const outlineLayer = new OutlineLayer(outline_opts);
    const map4d_layer =  new Map4DModelsThreeLayer({
                id: 'test_layer',
                vectorSourceId: vectorSourceId,
                sourceLayer: sourceLayer,
                rootUrl: 'http://10.225.1.11:8080',
                minZoom: 16,
                maxZoom: 19,
                sun : sun_options,
               /* onPick: (info : any) => {
                    overlay_layer.setCurrentTileID(info.overScaledTileId);
                    overlay_layer.attachGizmoToObject(info.three.object);
                    outlineLayer.setCurrentTileID(info.overScaledTileId);
                    outlineLayer.attachObject(info.three.object);
                },
                onPickfail : (info : any) => {
                    overlay_layer.unselect();
                    outlineLayer.unselect();
                    console.log('pick fail');
                }*/
            });
    map4d_layer.setSunPos( sunPos.altitude,sunPos.azimuth);
    const editor_layer = new EditLayer({
        id : 'editor_layer',
        applyGlobeMatrix : false,
        editorLevel : 16,
        onPick: (info : any) => {
            overlay_layer.setCurrentTileID(info.overScaledTileId);
            overlay_layer.attachGizmoToObject(info.three.object);
            outlineLayer.setCurrentTileID(info.overScaledTileId);
            outlineLayer.attachObject(info.three.object);
        },
        onPickfail : (info : any) => {
            overlay_layer.unselect();
            outlineLayer.unselect();
        }
    });
    map.addLayer(map4d_layer);
    map.addLayer(editor_layer);
    map.addLayer(overlay_layer);
    map.addLayer(outlineLayer);
    bindTransformUI(overlay_layer);
    //load example glb file
    const str_glb_path = './assets/test.glb';
    loadModelFromGlb(str_glb_path).then((objec3d) => {
        editor_layer.addObjectsToCache([{
            id : str_glb_path,
            object3d : objec3d
        }]);
        editor_layer.addObjectToScene(str_glb_path);
    }).catch((e) => {
        console.error("error when load glb file");
    })
}

map.on('load', () => {
    addMap4d(map); 
});

// Add click handler to inspect features

