import { NoToneMapping } from 'three';
import * as THREE from 'three';
import * as utility from './utility.js'
import {externalCamera} from './character.js'
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js';

// function movePlayer(key){
    
//     let moveObject = utility.findMesh('mainCharacter')
//     if (moveObject) {
//         // object exists, begin command execution...

//         if(key == 'w'){
//             //moveObject.position.z -= 0.1;
//             //externalCamera
//         }
//         if(key == 's'){
//             //moveObject.position.z += 0.1;
//         }
//         if(key == 'a'){
//             //moveObject.position.x -= 0.1;
//         }
//         if(key == 'd'){
//             //moveObject.position.x += 0.1;
//         }
        

//     }
// }



export class Input{
    constructor(canvas, character, camera){
        this.previewPlacement_b = false;
        this.onPlacementConfirm = () => false;
        this.onPlacementCancel = () => {};
        this.onAttack = () => {};
        this.keys = new Set();
        this.velocity = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        this.desiredVelocity = new THREE.Vector3();

        canvas.addEventListener('focus', () => {
            // Complete focus on screen.
        });
        
        canvas.addEventListener('blur', () => {
            // No focus, go to ingame menu
        });

        window.addEventListener('keydown', (key) => {
            if (key.target instanceof HTMLElement &&
                (key.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(key.target.tagName))) {
                return;
            }

            const pressedKey = key.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(pressedKey)) {
                this.keys.add(pressedKey);
            } else if (pressedKey === 'escape') {
                this.onPlacementCancel();
            } else if (pressedKey === 'f' && !key.repeat) {
                this.onAttack();
            } else if (pressedKey === 'e' && !key.repeat) {
                if (this.previewPlacement_b && this.onPlacementConfirm()) {
                    this.previewPlacement_b = false;
                }
            }
        });

        window.addEventListener('keyup', (key) => {
            this.keys.delete(key.key.toLowerCase());
        });

        window.addEventListener('blur', () => {
            this.keys.clear();
            this.velocity.set(0, 0, 0);
        });
    }

    update(delta, character, camera){
        camera.camera.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();
        this.right.crossVectors(this.forward, this.up).normalize();

        // Add movement velocity on button input, resulting in smooth calculated movement.

        this.desiredVelocity.set(0, 0, 0);
        if (this.keys.has('w')) this.desiredVelocity.add(this.forward);
        if (this.keys.has('s')) this.desiredVelocity.sub(this.forward);
        if (this.keys.has('d')) this.desiredVelocity.add(this.right);
        if (this.keys.has('a')) this.desiredVelocity.sub(this.right);

        if (this.desiredVelocity.lengthSq() > 0) {
            this.desiredVelocity.normalize().multiplyScalar(3);
        }

        // Interpolate between current velocity and next velocity value for smoothness.
        this.velocity.lerp(this.desiredVelocity, 0.1);
        character.character.position.addScaledVector(this.velocity, delta);
    }
}
