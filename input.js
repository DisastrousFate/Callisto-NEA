import * as THREE from 'three';

/*---------------------------//
       KEYBOARD INPUT
//---------------------------*/

// early movement
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
        this.previewPlacement_b = false; // preview off
        // input callbacks
        this.onPlacementConfirm = function() { return false; }; // wait for the real handler
        this.onPlacementCancel = function() {};
        this.onAttack = function() {};
        this.keys = new Set(); // held keys
        this.velocity = new THREE.Vector3(); // current speed
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        this.desiredVelocity = new THREE.Vector3(); // target velocity

        // leave text fields alone
        window.addEventListener('keydown', (key) => {
            if (key.target instanceof HTMLElement &&
                (key.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(key.target.tagName))) {
                return;
            }

            const pressedKey = key.key.toLowerCase(); // normalise key
            if (['w', 'a', 's', 'd'].includes(pressedKey)) {
                this.keys.add(pressedKey); // track movement
            } else if (pressedKey === 'escape') {
                this.onPlacementCancel(); // cancel preview
            } else if (pressedKey === 'f' && !key.repeat) { // single attack
                this.onAttack();
            } else if (pressedKey === 'e' && !key.repeat) { // single confirm
                if (this.previewPlacement_b && this.onPlacementConfirm()) {
                    this.previewPlacement_b = false; // preview done
                }
            }
        });

        window.addEventListener('keyup', (key) => {
            this.keys.delete(key.key.toLowerCase()); // key released
        });

        // clear keys when focus is lost
        window.addEventListener('blur', () => {
            this.keys.clear();
            this.velocity.set(0, 0, 0); // stop movement
        });
    }

    /*---------------------------//
          PLAYER MOVEMENT
    //---------------------------*/

    // - turn held keys into movement relative to the camera
    update(delta, position, camera){
        camera.camera.getWorldDirection(this.forward); // camera forward
        // ground movement
        this.forward.y = 0;
        this.forward.normalize(); // unit direction
        this.right.crossVectors(this.forward, this.up).normalize(); // right angle to camera forward

        // held keys

        this.desiredVelocity.set(0, 0, 0); // reset target
        if (this.keys.has('w')) this.desiredVelocity.add(this.forward);
        if (this.keys.has('s')) this.desiredVelocity.sub(this.forward);
        if (this.keys.has('d')) this.desiredVelocity.add(this.right);
        if (this.keys.has('a')) this.desiredVelocity.sub(this.right);

        if (this.desiredVelocity.lengthSq() > 0) { // has movement
            // keep diagonals from moving faster
            this.desiredVelocity.normalize().multiplyScalar(3);
        }

        // smooth movement
        this.velocity.lerp(this.desiredVelocity, 0.1);
        position.addScaledVector(this.velocity, delta); // frame displacement
    }
}
