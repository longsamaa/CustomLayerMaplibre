import * as THREE from 'three';
import { Vector3 } from 'three';
import { TransformControls,TransformControlsMode,TransformControlsGizmo } from 'three/examples/jsm/controls/TransformControls.js';
export class MaplibreControlGizmo extends TransformControlsGizmo {
    constructor() {
        super();
        console.log("MaplibreControlGizmo constructor - this:", this.constructor.name);
        // Override method trực tiếp
        const originalUpdate = this.updateMatrixWorld.bind(this);
        this.updateMatrixWorld = (force : boolean) : void => {
            console.log("maplibre control gizmo updateMatrixWorld called!");
            originalUpdate(force);
        };
    }
    updateMatrixWorld(force : boolean){
        super.updateMatrixWorld(force);
        console.log("maplibre control gizmo update");
    }
}