import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';


export class HUD {
    constructor(scene = THREE.Scene, camera = THREE.Camera){
        this.scene = scene;
        this.camera = camera;
    }

    square(){
        const geometry = new THREE.PlaneGeometry(.5,.5,1,1);
        const material = new THREE.MeshBasicMaterial({ color: 'white' });
        const square = new THREE.Mesh(geometry, material);
        square.position.x = 0;
        square.position.y = 2;
        square.position.z = -5; // Dont block or be behind camera!
        square.renderOrder = 9999;
        this.camera.add(square)
    }
}

// Cube rendered to camera to render as 2D
// const geometry2d = new THREE.BoxGeometry(1, 1, 1);
// const material2d = new THREE.MeshBasicMaterial({ color: 'white' });
// const cube2d = new THREE.Mesh(geometry2d, material2d);
// camera.add(cube2d);