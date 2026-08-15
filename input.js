import { NoToneMapping } from 'three';
import {gameObjects} from './main.js'


function findMesh(name){
    (async() => {
        console.log("waiting for variable");
        let found = false;
        let object;

        do {
            for (let i of gameObjects){
            
                if(i.name == name){
                    found = true;
                    object = gameObjects[i]
                }
            }
          
          
        } while (found == false)
        
        console.log(object);
    // await new Promise(resolve => setTimeout(resolve, 1000));

    })();
}

function movePlayer(){

}



export class Input{
    constructor(canvas){

        canvas.addEventListener('focus', () => {
            // Complete focus on screen.
        });
        
        canvas.addEventListener('blur', () => {
            // No focus, go to ingame menu
        });

        canvas.addEventListener('keydown', (key) => {
            
            switch (key.key){
                case 'w':
                    //movePlayer(key.key);
                    findMesh('moveObject')
                    break;
                case 'a':
                    
                    break;
                case 's':
                    
                    break;
                case 'd':
                    
                    break;
            }
            
            
        });

    }
}

