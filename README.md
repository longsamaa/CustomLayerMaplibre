# MapLibre GL JS - Map4D Vector Tiles Project

This project demonstrates loading vector tiles from Map4D tile service using MapLibre GL JS.

## Features

- Loads vector tiles from Map4D tile server
- Displays buildings, roads, and POIs with custom styling
- Includes navigation controls
- Console logging to inspect available source layers

## Getting Started

### Option 1: Using a Local Server

Install a simple HTTP server:

```bash
npm install -g http-server
```

Then run it in the project directory:

```bash
http-server
```

Open your browser and navigate to `http://localhost:8080`

### Option 2: Using Python

If you have Python installed:

```bash
# Python 3
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Option 3: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Customizing Layers

The vector tile source layers (building, road, poi) may need to be adjusted based on the actual structure of the Map4D tiles. Check the browser console to see the available source layers after the map loads.

## API Key

The project uses the Map4D API key provided in the URL. Make sure this key is valid and has the necessary permissions.

## Resources

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/api/)
- [Vector Tiles Specification](https://github.com/mapbox/vector-tile-spec)
