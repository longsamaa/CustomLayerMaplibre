import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export class MapboxTransformControls extends TransformControls {
    private map: any;
    private currentTile: any;
    private applyGlobeMatrix: boolean;

    constructor(camera: THREE.Camera, domElement: HTMLElement, map: any, applyGlobeMatrix: boolean = false) {
        super(camera, domElement);
        this.map = map;
        this.applyGlobeMatrix = applyGlobeMatrix;
    }

    setCurrentTile(tile: any) {
        this.currentTile = tile;
    }

    // Custom method để tính ray từ screen coordinates
    private updateRayCast(ndc : THREE.Vector2, raycaster: THREE.Raycaster): boolean {
        if (!this.map || !this.currentTile) return false;
        const tr: any = (this.map as any).transform;
        if (!tr?.getProjectionData) {false;}
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
        return true;
    }

    // Override pointerHover
    pointerHover(pointer: any) {
        if (this.object === undefined || this.dragging === true) return;
        if(pointer === null) {return;}
        const raycaster = this.getRaycaster();
        const ndc = new THREE.Vector2(
            pointer.x,
            pointer.y
        ); 
        if(!this.updateRayCast(ndc,raycaster)){
            return; 
        }
        const gizmo = (this as any)._gizmo;
        const intersect = this.intersectObjectWithRay(gizmo.picker[this.mode], this.getRaycaster());
        if (intersect) {
            this.axis = intersect.object.name; 
        }
        else {
            this.axis = null;
        }
        // if (pointer !== null) {
        //     const raycaster = this.getRaycaster();
        //     console.log(pointer); 
        //     // Dùng custom ray calculation
        //     if (!this.calculateRay(pointer.clientX, pointer.clientY, raycaster)) {
        //         return;
        //     }
        // }

        // const gizmo = (this as any)._gizmo;
        // const intersect = this.intersectObjectWithRay(gizmo.picker[this.mode], this.getRaycaster());

        // if (intersect) {
        //     this.axis = intersect.object.name;
        // } else {
        //     this.axis = null;
        // }
    }

    // Override pointerDown
    pointerDown(pointer: any) {
        if (this.object === undefined || this.dragging === true || (pointer != null && pointer.button !== 0)) return;

        if (this.axis !== null) {
            if (pointer !== null) {
                const raycaster = this.getRaycaster();
                
                // Dùng custom ray calculation
                if (!this.calculateRay(pointer.clientX, pointer.clientY, raycaster)) {
                    return;
                }
            }

            const plane = (this as any)._plane;
            const planeIntersect = this.intersectObjectWithRay(plane, this.getRaycaster(), true);

            if (planeIntersect) {
                this.object.updateMatrixWorld();
                this.object.parent.updateMatrixWorld();

                const positionStart = (this as any)._positionStart;
                const quaternionStart = (this as any)._quaternionStart;
                const scaleStart = (this as any)._scaleStart;
                const worldScaleStart = (this as any)._worldScaleStart;

                positionStart.copy(this.object.position);
                quaternionStart.copy(this.object.quaternion);
                scaleStart.copy(this.object.scale);

                this.object.matrixWorld.decompose(
                    (this as any).worldPositionStart,
                    (this as any).worldQuaternionStart,
                    worldScaleStart
                );

                (this as any).pointStart.copy(planeIntersect.point).sub((this as any).worldPositionStart);
            }

            this.dragging = true;
            this.dispatchEvent({ type: 'mouseDown', mode: this.mode });
        }
    }

    // Override pointerMove
    pointerMove(pointer: any) {
        const axis = this.axis;
        const mode = this.mode;
        const object = this.object;
        let space = this.space;

        if (mode === 'scale') {
            space = 'local';
        } else if (axis === 'E' || axis === 'XYZE' || axis === 'XYZ') {
            space = 'world';
        }

        if (object === undefined || axis === null || this.dragging === false || (pointer !== null && pointer.button !== -1)) return;

        if (pointer !== null) {
            const raycaster = this.getRaycaster();
            
            // Dùng custom ray calculation
            if (!this.calculateRay(pointer.clientX, pointer.clientY, raycaster)) {
                return;
            }
        }

        const plane = (this as any)._plane;
        const planeIntersect = this.intersectObjectWithRay(plane, this.getRaycaster(), true);

        if (!planeIntersect) return;

        // Call parent's pointerMove logic
        super.pointerMove(pointer);
    }

    // Helper method for intersection (copy từ TransformControls source)
    private intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible?: boolean): any {
        const allIntersections = raycaster.intersectObject(object, true);

        for (let i = 0; i < allIntersections.length; i++) {
            if (allIntersections[i].object.visible || includeInvisible) {
                return allIntersections[i];
            }
        }

        return false;
    }

    // Override getPointer để add clientX/clientY
    protected getPointer(event: PointerEvent): any {
        if (this.domElement.ownerDocument.pointerLockElement) {
            return {
                x: 0,
                y: 0,
                button: event.button,
                clientX: 0,
                clientY: 0
            };
        } else {
            const rect = this.domElement.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) / rect.width * 2 - 1,
                y: -(event.clientY - rect.top) / rect.height * 2 + 1,
                button: event.button,
                clientX: event.clientX,
                clientY: event.clientY
            };
        }
    }
}