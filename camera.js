import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export class Camera{
  constructor(scene, camera, renderer){
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer; // Hoping that these objects resemble pointers...
    this.newPos = 0;
    this.orbitDistance = 2;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.autoRotate = false;
    this.controls.enablePan = false;
    this.controls.update();

  }

  animate(target){
    // if(this.newPos > 0){
    //   this.newPos = this.newPos + 0.00001;
    //   this.controls.target.x = target.position.x + this.newPos;


    // } else{
    //   this.newPos = this.newPos + 0.000001;
    //   this.controls.target = target.position;
    //   this.controls.saveState();
    // }
    
    if(this.newPos == 0){
      this.camera.position.set(
        target.position.x + this.orbitDistance,
        target.position.y + this.orbitDistance,
        target.position.z + this.orbitDistance
      );

      this.newPos += 1;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

