// Use global maplibregl and THREE from CDN
// declare const maplibregl: any;
import maplibregl from 'maplibre-gl'
import * as THREE from 'three'
import { mapCustomLayer } from "./customLayer";

// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {
            'osm-raster': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
            }
        },
        layers: [
            {
                id: 'osm-background',
                type: 'raster',
                source: 'osm-raster',
                minzoom: 0,
                maxzoom: 22
            }
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
    },
    center: [106.72140935056187, 10.794890570901666], // Hanoi, Vietnam
    zoom: 16
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), 'top-right');

// Enable tile boundaries
map.showTileBoundaries = true;

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
map.on('load', () => {
    // Create instance of custom layer
    let customLayer = new mapCustomLayer(); 
    
    // Add the custom layer
    map.addLayer(customLayer);

    console.log('Map loaded with custom Three.js layer');
    
    // Trigger update on the custom layer when map moves
    map.on('moveend', () => {
    });
});

// Add click handler to inspect features
map.on('click', (e: any) => {
    const features = map.queryRenderedFeatures(e.point);
    console.log('Clicked features:', features);
});
