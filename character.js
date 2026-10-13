import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {gameObjects} from './main.js'
import * as utility from './utility.js'
import * as THREE from 'three';

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
export class externalCamera{
  constructor(scene, camera, renderer, character){
    this.scene = scene;
    this.camera = camera;

    // Start the camera really high up so plane and character can be seen!
    this.camera.position.set(0,10,6)
    this.character = character;

    // Assign ownership of camera to the character (helps modularity in future)
    character.character.add(this.camera);

    // Make sure world-coordinates are used instead of locally coordinate calculations
    this.character.character.updateMatrixWorld(true,false);

    const target = new THREE.Vector3();
    this.character.character.getWorldPosition(target);
    this.camera.lookAt(target)
  
    console.log(target)
    console.log(this.camera.position)

    this.deltaX;
    this.deltaY;
    this.deltaZ;
  }

  animate(){
    // this.lookPosition = this.character.character.position.clone().add(this.cameraOffset)
    // this.camera.lookAt(this.lookPosition)

    const target = new THREE.Vector3();
    // Return world position of character, storing the value in the variable 'target'
    this.character.character.getWorldPosition(target);
    this.camera.lookAt(target)
  }
}

export class Camera{
  constructor(scene, camera, renderer){
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer; // Hoping that these objects resemble pointers...
    this.setup = 0;
    this.orbitDistance = 2;
    this.lastPosition = new THREE.Vector3();

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.autoRotate = false;
    this.controls.enablePan = false;
    this.controls.update();

  }

  animate(target){

    
    // if (Math.abs(deltaS) > 0.01) {
    //   this.setup = 0;
    //   console.log("Target moved, resetting camera setup.");
    // }


    // if(this.newPos > 0){
    //   this.newPos = this.newPos + 0.00001;
    //   this.controls.target.x = target.position.x + this.newPos;


    // } else{
    //   this.newPos = this.newPos + 0.000001;
    //   this.controls.target = target.position;
    //   this.controls.saveState();
    // }


    
    if(this.setup == 0){
      this.camera.position.set(
        target.position.x + this.orbitDistance,
        target.position.y + this.orbitDistance,
        target.position.z + this.orbitDistance
      );

      this.setup = 1;
    }

    // this.lastPosition = target.position;

    this.camera.lookAt(target.position);
    

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
