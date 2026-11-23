import {gameObjects} from './main.js'

export function findMesh(meshName) {
    return gameObjects.find(object => object.name === meshName); // first match
}

/*
//-----------------------//
        ASYNC FUNCTIONS
//-----------------------//
*/

export async function a_delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms)); // resolve after the delay
}