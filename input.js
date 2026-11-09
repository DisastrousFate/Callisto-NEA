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

        canvas.addEventListener('focus', () => {
            // Complete focus on screen.
        });
        
        canvas.addEventListener('blur', () => {
            // No focus, go to ingame menu
        });

        canvas.addEventListener('keydown', (key) => {
            console.log(key.key)

            const forward = new THREE.Vector3();
            camera.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3()
                .crossVectors(forward, new THREE.Vector3(0, 1, 0))
                .normalize();

            const nextPosition = character.character.position.clone();

            switch (key.key) {
                case 'w':
                    nextPosition.addScaledVector(forward, 0.1);
                    break;
                case 's':
                    nextPosition.addScaledVector(forward, -0.1);
                    break;
                case 'a':
                    nextPosition.addScaledVector(right, -0.1);
                    break;
                case 'd':
                    nextPosition.addScaledVector(right, 0.1);
                    break;
                case 'ArrowLeft':
                    break;
                case 'ArrowRight':
                    break;
                case 'e':
                    if(this.previewPlacement_b == true){
                        this.previewPlacement_b = false;
                    }
                    else{
                        this.previewPlacement_b = true;
                    }
                    break;
            }

            nextPosition.y = character.character.position.y;
            character.character.position.copy(nextPosition);

            
            
        });

    }
}
