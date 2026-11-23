import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {gameObjects} from './main.js'
import * as utility from './utility.js'
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

let globalScene = null;

export class Character{
  constructor(scene, px = 0, py = 1, pz = 0, npc = false){
    
    this.character = new THREE.Group(); // character root
    this.character.position.set(px, py, pz);
    if(npc){ // choose name
      this.character.name = 'npcCharacter';
    } else{
      this.character.name = 'mainCharacter';
      globalScene = scene; // remember scene
    }
    globalScene.add(this.character);
    gameObjects.push(this.character); // register object

    this.mixer = null;
    this.idleAction = null;
    this.walkAction = null;
    this.currentAction = null;
    this.isMoving = false; // starts idle

    // astro model

    const loader = new GLTFLoader();
    loader.load('./assets/walking_astronaut/scene.gltf', (gltf) => { // load callback

      const model = gltf.scene;
      this.model = model;

      const textureLoader = new THREE.TextureLoader();
      const loadDiffuseMap = (filename) => { // texture helper
        const texture = textureLoader.load(
          `./assets/walking_astronaut/textures/${filename}`,
          undefined,
          undefined,
        );

        texture.flipY = false; // texture coords
        texture.colorSpace = THREE.SRGBColorSpace; // colour space
        return texture;
      };

      // material names

      const materials = new Map([ // material overrides
        ['material_0', new THREE.MeshStandardMaterial({
          map: loadDiffuseMap('material_0_diffuse.png'),
          roughness: 0.9,
        })],
        ['material_1', new THREE.MeshStandardMaterial({
          color: 0x303438,
          roughness: 0.85,
        })],
        ['material_2', new THREE.MeshStandardMaterial({
          map: loadDiffuseMap('material_2_diffuse.png'),
          roughness: 0.9,
        })],
      ]);

      model.traverse(function (object) { // visit children
        if (object.isMesh) {
          const material = materials.get(object.material.name); // match name
          if (material) {
            object.material = material; // swap material
          }
        }
      });

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3()); // objects bounds
      const modelScale = 1.8 / size.y; // astro height

      model.scale.setScalar(modelScale); // uniform scale
      model.position.set(
        -(bounds.min.x + bounds.max.x) * modelScale / 2, // centre x
        -bounds.min.y * modelScale - this.character.position.y, // offset feet below the camera target
        -(bounds.min.z + bounds.max.z) * modelScale / 2 // centre z
      );

      this.character.add(model); // attach model

      // astro anims

      this.mixer = new THREE.AnimationMixer(model);
      const idleClip = gltf.animations.find(function (clip) { // find idle
        return clip.name.toLowerCase() === 'idle';
      });

      const walkClip = gltf.animations.find(function (clip) { // find walk
        return clip.name.toLowerCase().includes('walk');
      });

      if (!walkClip) {
        console.error('Walking astronaut model does not contain a walking animation.');
        return;
      }

      this.walkAction = this.mixer.clipAction(walkClip);
      if (idleClip) {
        this.idleAction = this.mixer.clipAction(idleClip);
      }
      this.currentAction = this.idleAction || this.walkAction; // use walk if idle is missing
      this.currentAction.play();
      
      if (!this.isMoving && !this.idleAction) { // no idle
        this.walkAction.paused = true;
      }
    }, undefined, (error) => {
      console.error('Failed to load the walking astronaut model.', error);
    });
  }

  // - turn with movement and blend between idle and walk
  update(delta, velocity){
    if (!this.mixer || !this.walkAction) return; // wait loading

    // face movement

    const isMoving = velocity.lengthSq() > 0.01; // ignore tiny velocity changes
    if (isMoving) {
      const targetRotation = Math.atan2(velocity.x, velocity.z); // target heading
      const rotationDelta = Math.atan2( // wrap angle to avoid full turns
        Math.sin(targetRotation - this.character.rotation.y),
        Math.cos(targetRotation - this.character.rotation.y)
      );

      // smooth turn
      this.character.rotation.y += rotationDelta * (1 - Math.exp(-12 * delta));
    }

    if (this.isMoving !== isMoving) { // movement changed
      this.isMoving = isMoving;

      let nextAction;
      if (isMoving) {
        nextAction = this.walkAction; // start walking
      } else if (this.idleAction) {
        nextAction = this.idleAction; // return idle
      } else {
        nextAction = this.walkAction; // walk fallback
      }

      if (nextAction !== this.currentAction) { // changed clip
        const previousAction = this.currentAction;

        nextAction.reset().play(); // restart clip

        if (previousAction) {
          previousAction.crossFadeTo(nextAction, 0.2, true); // fade from the old clip
        }

        this.currentAction = nextAction;
      } else if (isMoving && !this.idleAction) { // resume walking
        nextAction.reset().play();
      }

      this.walkAction.paused = !isMoving && !this.idleAction; // pause walk if idle is missing
    }

    this.mixer.update(delta); // advance anim
  }
}

// fixed camera
export class _externalCamera{
  constructor(scene, camera, renderer, character){
    this.scene = scene;
    this.camera = camera;

    // camera height
    this.cameraOffset = new THREE.Vector3(0,10,6);
    this.character = character;

    const target = new THREE.Vector3();
    this.character.character.getWorldPosition(target); // world target
    this.camera.position.copy(target).add(this.cameraOffset); // player offset
    this.camera.lookAt(target); // aim camera

  }

  animate(){
    const target = new THREE.Vector3();
    this.character.character.getWorldPosition(target); // world target
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
    this.followDelta = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(0,3.5,6);
    this.character.character.getWorldPosition(target);
    this.camera.position.copy(target).add(this.cameraOffset); // player offset
    this.orbitDistance = 6;

    this.controls = new OrbitControls(camera, renderer.domElement); // orbit input

    // orbit limits

    this.groundClearance = 0.2; // ground clearance
    this.controls.minDistance = 0.75; // zoom minimum
    this.controls.maxDistance = 20;  // farthest allowed
    this.controls.enableZoom = true;
    this.controls.maxPolarAngle = Math.PI / 2; // level limit
    this.controls.target.copy(target); // orbit centre
    this.controls.rotateSpeed = 0.7; // turn speed
    
    this.controls.enablePan = false; // lock pan
    this.controls.update();

  }

  animate(){

    // follow player

    this.character.character.getWorldPosition(this.followDelta); // player position
    this.followDelta.sub(this.controls.target); // how far the player moved
    this.camera.position.add(this.followDelta); // keep orbit offset while moving
    this.controls.target.add(this.followDelta); // shift target
    this.controls.update();

    if (this.camera.position.y < this.groundClearance) {
      this.camera.position.y = this.groundClearance; // clamp height
      this.camera.lookAt(this.controls.target);
    }
  
  }
}
