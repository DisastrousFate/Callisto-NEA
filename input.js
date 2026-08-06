import {gameObjects} from './main.js'

// function findMesh(x){
//     for (let i = 0; i < x.length; i++){
//         if(gameObjects[i])
// }

(async() => {
    console.log("waiting for variable");
    while(!gameObjects) // define the condition as you like
        await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("variable is defined");
})();
console.log("above code doesn't block main function stack");

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
                    console.log('w pressed');
                    
                    break;
                case 'a':
                    console.log('a pressed');
                    break;
                case 's':
                    console.log('s pressed');
                    break;
                case 'd':
                    console.log('d pressed');
                    break;
            }
            
            
        });

    }
}

