import {gameObjects} from './main.js'

export function findMesh(meshName) {
    
    console.log(gameObjects)

    let meshFound = false;
    let foundMesh;
    do {
        currentMesh = _findMesh(meshName);
        if(currentMesh != null){
            meshFound = true;
            foundMesh = currentMesh;
            
        }

        setTimeout(30);
    }  
    while(meshFound == false);

    return _findMesh(meshName);
}


function _findMesh(meshName) {
    const found = gameObjects.find(object => object.name === meshName);
    return found;
}

/*
//-----------------------//
        ASYNC FUNCTIONS
//-----------------------//
*/

export async function a_delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}