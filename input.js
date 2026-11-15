import * as THREE from 'three';

/*---------------------------//
       KEYBOARD INPUT
//---------------------------*/

// Earlier movement attempt
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
        // main.js supplies these actions after the input object has been created.
        this.onPlacementConfirm = () => false;
        this.onPlacementCancel = () => {};
        this.onAttack = () => {};
        this.keys = new Set();
        this.velocity = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        this.desiredVelocity = new THREE.Vector3();

        // Ignore game keys when typing into a text box.
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

        // Releasing focus must stop movement, or a held key could get stuck.
        window.addEventListener('blur', () => {
            this.keys.clear();
            this.velocity.set(0, 0, 0);
        });
    }

    /*---------------------------//
          PLAYER MOVEMENT
    //---------------------------*/

    update(delta, character, camera){
        camera.camera.getWorldDirection(this.forward);
        // Ignore the camera looking up/down - the player should move along the floor.
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
            // Diagonal movement should not be faster than moving in one direction.
            this.desiredVelocity.normalize().multiplyScalar(3);
        }

        const response = this.desiredVelocity.lengthSq() > 0 ? 10 : 14;
        const smoothing = 1 - Math.exp(-response * delta);

        // Interpolate between current velocity and next velocity value for smoothness.
        this.velocity.lerp(this.desiredVelocity, smoothing);
        character.character.position.addScaledVector(this.velocity, delta);
    }
}
