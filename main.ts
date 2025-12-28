// Use global maplibregl and THREE from CDN
// declare const maplibregl: any;
import maplibregl, { OverscaledTileID } from 'maplibre-gl'
import * as THREE from 'three'
import { mapCustomLayer } from "./src/customLayer";
import {Map4DModelsThreeLayer} from './src/Layer4DModels'
import {OverlayLayerOptions,OverlayLayer} from './src/OverlayLayer' 

// Flag to enable/disable proxy
const USE_PROXY = false; // Set to false to use direct API calls

// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: './vbd_style.json',
    center: [106.72140935056187, 10.794890570901666],
    zoom: 16, 
    antialias: true
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

function addMap4d(map : maplibregl.Map) {
    const vectorSourceId = "map4d"; 
    map.addSource(vectorSourceId, {
        type: "vector",
        tiles: [
            "http://10.225.1.11:3000/map4d_3dmodels/{z}/{x}/{y}"
        ],
        minzoom: 16,
        maxzoom: 17
    });
    const sourceLayer = "map4d_3dmodels"; 
    const map4d_layer =  new Map4DModelsThreeLayer({
                id: 'test_layer',
                vectorSourceId: vectorSourceId,
                sourceLayer: sourceLayer,
                rootUrl: 'http://1.225.1.11:8080',
                minZoom: 13,
                maxZoom: 25,
                onPick: (info : any) => {
                    console.log('PICK layer 4d', info);
                },
            });
    map.addLayer(map4d_layer);
}

function addOverlayLayer(map : maplibregl.Map){
    const opts : OverlayLayerOptions = {
        id : 'overlay_test',
        level_tile : 16, 
        tile_size : 512, 
        min_zoom : 16, 
        max_zoom : 25
    }
    const overlay_layer = new OverlayLayer(opts); 
    map.addLayer(overlay_layer); 
    console.log('add overlay'); 
}

map.on('load', () => {
    addOverlayLayer(map); 
    // const vectorSourceId = "map4d"; 
    // map.addSource(vectorSourceId, {
    //     type: "vector",
    //     tiles: [
    //         "http://10.225.1.11:3000/map4d_3dmodels/{z}/{x}/{y}"
    //     ],
    //     minzoom: 16,
    //     maxzoom: 17
    // });
    // const sourceLayer = "map4d_3dmodels"; 
    // const map4d_layer =  new Map4DModelsThreeLayer({
    //             id: 'test_layer',
    //             vectorSourceId: vectorSourceId,
    //             sourceLayer: sourceLayer,
    //             rootUrl: 'http://1.225.1.11:8080',
    //             minZoom: 13,
    //             maxZoom: 25,
    //             onPick: (info : any) => {
    //                 console.log('PICK layer 4d', info);
    //             },
    //         });
    // map.addLayer(map4d_layer);
    // console.log('add layer'); 
});

// Add click handler to inspect features
map.on('click', (e: any) => {
    const features = map.queryRenderedFeatures(e.point);
    console.log('Clicked features:', features);
});
