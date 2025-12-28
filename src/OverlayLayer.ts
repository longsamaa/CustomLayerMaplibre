import type {
    Map,
    OverscaledTileID,
    CustomLayerInterface,
    CustomRenderMethodInput,
} from 'maplibre-gl';
import type { LatLon } from './interface_class';
import { MapboxTransformControls } from './MaplibreControl';
import { createYupToZUpMatrix } from './model/objModel';
import { tileLocalToLatLon, getMetersPerExtentUnit } from './convert/map_convert';
import * as THREE from 'three';


export type OverlayLayerOptions = {
    id: string; 
    level_tile : number; 
    tile_size : number; 
    min_zoom : number; 
    max_zoom : number; 
}

export class OverlayLayer implements CustomLayerInterface {
    id : string; 
    level_tile : number; 
    type: 'custom' = 'custom'; 
    renderingMode: '3d' = '3d';
    private tileSize : number; 
    private map: Map | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private scene : THREE.Scene | null = null; 
    private raycaster = new THREE.Raycaster();
    private gizmo: MapboxTransformControls | null = null;
    private visible = true; 
    private minZoom : number; 
    private maxZoom : number; 
    private applyGlobeMatrix : boolean | false = false;  
    private currentTile : OverscaledTileID | null = null;  
    constructor(opts: OverlayLayerOptions){
        this.id = opts.id;
        this.level_tile = opts.level_tile; 
        this.tileSize = opts.tile_size; 
        this.minZoom = opts.min_zoom; 
        this.maxZoom = opts.max_zoom; 
    }

     private clampZoom(z: number): number {
        return Math.max(this.minZoom, Math.min(this.maxZoom, z));
    }


    setCurrentTileID(overTile : OverscaledTileID){
        this.currentTile = overTile; 
        if(this.gizmo)
        {
            this.gizmo.setCurrentTile(overTile); 
        }
    }
    
    applyScaleZTransformGizmo(scaleZ : number){
        if(!this.gizmo) return; 
        this.gizmo.traverse((child: any) => {
            if (child.isMesh && child.material) {
                const scaleMatrix = new THREE.Matrix4().makeScale(1 / scaleZ, 1 , 1  );
                child.geometry.applyMatrix4(scaleMatrix);
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
                if (Array.isArray(child.material)) {
                child.material.forEach((mat: any) => {
                    // mat.side = THREE.DoubleSide;
                    mat.needsUpdate = true;
                });
                } else {
                    // child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
            }
        });
    }

    onAdd(map: Map, gl: WebGLRenderingContext): void
    {
        this.map = map; 
        this.camera = new THREE.PerspectiveCamera(); 
        this.camera.matrixAutoUpdate = false;
        this.scene = new THREE.Scene; 
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
        });
        this.renderer.autoClear = false; 
        this.gizmo = new MapboxTransformControls(this.camera, 
            this.renderer.domElement,
            this.map,
            this.applyGlobeMatrix); 
        this.gizmo.setMode("rotate");
        this.gizmo.showX = false; 
        this.gizmo.showY = false; 
        this.gizmo.showZ = true; 
        this.scene.add(this.gizmo);
        //create example box 

        
        const size = 50;
        const geometry = new THREE.BoxGeometry(size, 50, size);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            side: THREE.DoubleSide
         });
        const box = new THREE.Mesh(geometry, material);
        const mat : THREE.Matrix4 = createYupToZUpMatrix();
        box.geometry.applyMatrix4(mat); 
        const lat_lon: LatLon = tileLocalToLatLon(16,52196,30791,4096,4096);
        const scaleUnit = getMetersPerExtentUnit(lat_lon.lat, 16);



        box.matrixAutoUpdate = false; 
        box.updateMatrix(); 
        box.updateMatrixWorld(); 

        const group = new THREE.Group(); 
        group.add(box); 
        group.scale.set(scaleUnit,-scaleUnit,1.0); 
        group.position.set(4096,4096,100); 

        // this.applyScaleZTransformGizmo(scaleUnit); 
        this.gizmo.attach(group); 
        this.scene.add(group); 
        map.on('click', this.handleClick);
    }

    private updateRaycasterFromMapCoords(clientX: number, clientY: number, raycaster: THREE.Raycaster): boolean {
        if (!this.map || !this.currentTile || !raycaster) return false; // Check raycaster

        const canvas = this.map.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -(((clientY - rect.top) / rect.height) * 2 - 1)
        );

        const tr: any = (this.map as any).transform;
        if (!tr?.getProjectionData) return false;

        const proj = tr.getProjectionData({
            overscaledTileID: this.currentTile,
            applyGlobeMatrix: this.applyGlobeMatrix,
        });

        const mvp = new THREE.Matrix4().fromArray(proj.mainMatrix as any);
        const inv = mvp.clone().invert();
        
        const pNear = new THREE.Vector4(ndc.x, ndc.y, -1, 1).applyMatrix4(inv);
        pNear.multiplyScalar(1 / pNear.w);
        const pFar = new THREE.Vector4(ndc.x, ndc.y, 1, 1).applyMatrix4(inv);
        pFar.multiplyScalar(1 / pFar.w);
        
        const origin = new THREE.Vector3(pNear.x, pNear.y, pNear.z);
        const direction = new THREE.Vector3(pFar.x, pFar.y, pFar.z).sub(origin).normalize();
        
        raycaster.ray.origin.copy(origin);
        raycaster.ray.direction.copy(direction);
        console.log('update raycast'); 
        return true;
}

    private handleClick = (e: any) => {
        if (!this.map || !this.camera || !this.scene || !this.renderer || !this.visible) {return;}
        if(this.currentTile)
        {
            const canvas = this.map.getCanvas();
            const rect = canvas.getBoundingClientRect();
            const ndc = new THREE.Vector2(
                ((e.point.x) / rect.width) * 2 - 1,
                -(((e.point.y) / rect.height) * 2 - 1),
            );
            const tr: any = (this.map as any).transform;
            if (!tr?.getProjectionData) {return;}
            const proj = tr.getProjectionData({
                overscaledTileID: this.currentTile,
                applyGlobeMatrix: this.applyGlobeMatrix,
            });
            const mvp = new THREE.Matrix4().fromArray(proj.mainMatrix as any);
            const inv = mvp.clone().invert();
            const pNear = new THREE.Vector4(ndc.x, ndc.y, -1, 1).applyMatrix4(inv);
            pNear.multiplyScalar(1 / pNear.w);
            const pFar = new THREE.Vector4(ndc.x, ndc.y, 1, 1).applyMatrix4(inv);
            pFar.multiplyScalar(1 / pFar.w);
            const origin = new THREE.Vector3(pNear.x, pNear.y, pNear.z);
            const direction = new THREE.Vector3(pFar.x, pFar.y, pFar.z).sub(origin).normalize();
            this.raycaster.ray.origin.copy(origin);
            this.raycaster.ray.direction.copy(direction);
            const hits = this.raycaster.intersectObjects(this.scene.children, true);
            if (hits.length) {
                console.log('hit'); 
            }

        }
    }

    onRemove() : void
    {
        this.renderer?.dispose();
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.map = null;
    }

    render(gl: WebGLRenderingContext, args: CustomRenderMethodInput): void 
    {
        if (!this.map || !this.camera || !this.renderer || !this.visible || !this.gizmo) {return;}
        if(!this.currentTile)
        {
            const z = this.clampZoom(Math.round(this.map.getZoom()));
            const visibleTiles = this.map.coveringTiles({
                tileSize: this.tileSize,
                minzoom: 16,
                maxzoom: 16,
                roundZoom: true,
            } as any);
            for(const tile of visibleTiles)
            {
                if(tile.canonical.z == 16 
                    && tile.canonical.x == 52196 
                    && tile.canonical.y == 30791){
                    this.setCurrentTileID(tile); 
                }
            }
        }
        if(this.currentTile)
        {
            const tr: any = (this.map as any).transform;
            if (!tr?.getProjectionData) {return;}
            const projectionData = tr.getProjectionData({
                overscaledTileID: this.currentTile,
                applyGlobeMatrix: this.applyGlobeMatrix,
            });
            const tileMatrix = projectionData.mainMatrix;
            this.camera.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix);
            this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
            this.camera.updateMatrixWorld(true);
            this.gizmo.camera = this.camera;
            this.renderer.resetState();
            if(!this.scene) {return;}; 
            this.renderer.render(this.scene, this.camera);
        }
        this.map.triggerRepaint(); 
    }

}