import { NoToneMapping } from 'three';
import * as utility from './utility.js'
import {externalCamera} from './character.js'

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
    constructor(canvas, character, controls){

        canvas.addEventListener('focus', () => {
            // Complete focus on screen.
        });
        
        canvas.addEventListener('blur', () => {
            // No focus, go to ingame menu
        });

        canvas.addEventListener('keydown', (key) => {
            console.log(key.key)
            switch (key.key){
                case 'w':
                    // movePlayer(key.key);
                    //character.deltaZ = -0.1;
                    character.character.position.z -= 0.1;
                    break;
                case 'a':
                    // movePlayer(key.key);
                    //character.deltaX = -0.1;
                    character.character.position.x -= 0.1;
                    break;
                case 's':
                    // movePlayer(key.key);
                    //character.deltaZ = 0.1;
                    character.character.position.z += 0.1;
                    break;
                case 'd':
                    // movePlayer(key.key);
                    //character.deltaX = 0.1;
                    character.character.position.x += 0.1;
                    break;
                case 'ArrowLeft':
                    break;
                case 'ArrowRight':
                    break;
            }
            console.log('character:')
            console.log(character.character.position)

            
        });

    }
}

