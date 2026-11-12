import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {gameObjects} from './main.js'
import * as utility from './utility.js'
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

export class Character{
  constructor(scene){
    this.character = new THREE.Group();
    this.character.position.set(0, 1, 0);
    this.character.name = 'mainCharacter';
    scene.add(this.character);
    gameObjects.push(this.character);

    this.mixer = null;
    this.idleAction = null;
    this.walkAction = null;
    this.currentAction = null;
    this.isMoving = false;
    this.modelBounds = new THREE.Box3();

    // Astro Model + Textures

    const loader = new GLTFLoader();
    loader.load('./assets/walking_astronaut/scene.gltf', (gltf) => {

      const model = gltf.scene;
      this.model = model;

      const textureLoader = new THREE.TextureLoader();
      const loadDiffuseMap = (filename) => {
        const texture = textureLoader.load(
          `./assets/walking_astronaut/textures/${filename}`,
          undefined,
          undefined,
        );

        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };

      //Combine different materials into one map for astro

      const materials = new Map([
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

      model.traverse((object) => {
        if (!object.isMesh) return;
        const material = materials.get(object.material.name);
        if (material) object.material = material;
      });

      // Measure before parenting so the player position does not offset the model.
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const modelScale = 1.8 / size.y;
      model.scale.setScalar(modelScale);
      model.position.set(
        -(bounds.min.x + bounds.max.x) * modelScale / 2,
        -bounds.min.y * modelScale,
        -(bounds.min.z + bounds.max.z) * modelScale / 2
      );

      this.character.add(model);
      this.mixer = new THREE.AnimationMixer(model);
      const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase() === 'idle');
      const walkClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('walk'));

      if (!walkClip) {
        console.error('Walking astronaut model does not contain a walking animation.');
        return;
      }

      this.walkAction = this.mixer.clipAction(walkClip);
      this.idleAction = idleClip ? this.mixer.clipAction(idleClip) : null;
      this.currentAction = this.idleAction ?? this.walkAction;
      this.currentAction.play();
      if (!this.isMoving && !this.idleAction) this.walkAction.paused = true;
    }, undefined, (error) => {
      console.error('Failed to load the walking astronaut model.', error);
    });
  }

  update(delta, velocity){
    if (!this.mixer || !this.walkAction) return;

    // Calculate difference in orierentation between camera and character model orientation.

    const isMoving = velocity.lengthSq() > 0.01;
    if (isMoving) {
      const targetRotation = Math.atan2(velocity.x, velocity.z);
      const rotationDelta = Math.atan2(
        Math.sin(targetRotation - this.character.rotation.y),
        Math.cos(targetRotation - this.character.rotation.y)
      );

      // Apply the difference!
      this.character.rotation.y += rotationDelta * (1 - Math.exp(-12 * delta));
    }

    if (this.isMoving !== isMoving) {
      this.isMoving = isMoving;
      const nextAction = isMoving ? this.walkAction : (this.idleAction ?? this.walkAction);

      if (nextAction !== this.currentAction) {
        nextAction.reset().play();
        if (this.currentAction) this.currentAction.crossFadeTo(nextAction, 0.2, true);
        this.currentAction = nextAction;
      } else if (isMoving && !this.idleAction) {
        nextAction.reset().play();
      }
      this.walkAction.paused = !isMoving && !this.idleAction;
    }

    this.mixer.update(delta);
    this.character.updateWorldMatrix(true, true);
    this.modelBounds.setFromObject(this.model);
    if (this.modelBounds.min.y < 0) {
      this.character.position.y -= this.modelBounds.min.y;
    }
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
    this.followDelta = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(0,3.5,6);
    this.character.character.getWorldPosition(target);
    this.camera.position.copy(target).add(this.cameraOffset); // Apply OFFSET!
    this.orbitDistance = 6;

    this.controls = new OrbitControls(camera, renderer.domElement);

    // Ensure camera view is above the ground, not passing through.

    this.groundClearance = 0.2;
    this.controls.minDistance = 0.75;
    this.controls.maxDistance = 20;  // farthest allowed
    this.controls.enableZoom = true;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.copy(target);
    this.controls.rotateSpeed = 0.7;
    
    this.controls.enablePan = false;
    this.controls.update();

  }

  animate(){

    // Ensure camera view is above the ground, not passing through.

    this.character.character.getWorldPosition(this.followDelta);
    this.followDelta.sub(this.controls.target);
    this.camera.position.add(this.followDelta);
    this.controls.target.add(this.followDelta);
    this.controls.update();

    if (this.camera.position.y < this.groundClearance) {
      this.camera.position.y = this.groundClearance;
      this.camera.lookAt(this.controls.target);
    }
  
  }
}
