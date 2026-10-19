import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {gameObjects} from './main.js'
import * as utility from './utility.js'
import * as THREE from 'three';
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js';

export class Character{
  constructor(scene){
    // Define geometry
    this.character = new THREE.Mesh(
      new THREE.BoxGeometry(1,1,1),
      new THREE.MeshBasicMaterial({color: 	0x880808})
    );
    this.character.position.set(0,3,0);
    this.character.position.y = this.character.scale.y/2
    this.character.name = "mainCharacter"
    scene.add(this.character);
    gameObjects.push(this.character);

    // -------------------------- //

    this.deltaX;
    this.deltaY;
    this.deltaZ;

  }
}

// Doesn't use 'OrbitControls'
export class _externalCamera{
  constructor(scene, camera, renderer, character){
    this.scene = scene;
    this.camera = camera;

    // Start the camera really high up so plane and character can be seen!
    this.cameraOffset = new THREE.Vector3(0,10,6);
    this.character = character;

    const target = new THREE.Vector3();
    this.character.character.getWorldPosition(target);
    this.camera.position.copy(target).add(this.cameraOffset); // Apply OFFSET!
    this.camera.lookAt(target);

  }

  animate(){
    const target = new THREE.Vector3();
    this.cameraOffset.copy(new THREE.Vector3(this.cameraOffset.x - 0.1, this.cameraOffset.y , this.cameraOffset.z+0.1))
    this.character.character.getWorldPosition(target);
    this.camera.position.copy(target).add(this.cameraOffset);
    this.camera.lookAt(target);
  }
}

export class externalCamera{
  constructor(scene, camera, renderer, character){
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.character = character;
    
    const target = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(0,10,6);
    this.character.character.getWorldPosition(target);
    this.camera.position.copy(target).add(this.cameraOffset); // Apply OFFSET!
    this.orbitDistance = 6;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.target.copy(this.character.character.position)
    this.controls.rotateSpeed = 0.7;
    
    this.controls.enablePan = false;
    this.controls.update();

  }

  animate(){

    this.controls.update();
  }
}
