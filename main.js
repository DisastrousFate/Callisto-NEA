/*---------------------------//
      IMPORTED LIBRARIES
//---------------------------*/

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import { buildMesh, FontLoader, GLTFLoader, TextGeometry, ThreeMFLoader } from 'three/examples/jsm/Addons.js';


/*---------------------------//
  SHARED VARIABLE DEFINITIONS
//---------------------------*/

const gameObjects = []
export {gameObjects}

/*---------------------------//
           MODULES
//---------------------------*/

import * as graphics from './graphics.js';
import * as hud from './hud.js';
import * as character from './character.js';
import * as input from './input.js';
import { cameraFar, texture } from 'three/tsl';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { objectGroup } from 'three/tsl';

/*---------------------------//
        LOCAL VARIABLES
//---------------------------*/

const lilgui = new GUI();

const modelLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const groundTexturePath = './assets/callisto-ground.png';
const groundTextureRepeat = 20;
const groundPlaneTexture = textureLoader.load(groundTexturePath);
groundPlaneTexture.colorSpace = THREE.SRGBColorSpace;
groundPlaneTexture.wrapS = THREE.RepeatWrapping;
groundPlaneTexture.wrapT = THREE.RepeatWrapping;
groundPlaneTexture.repeat.set(groundTextureRepeat, groundTextureRepeat);

const scene = new THREE.Scene();
const skyboxFaces = [
  './assets/space-skybox/right.png',
  './assets/space-skybox/left.png',
  './assets/space-skybox/top.png',
  './assets/space-skybox/bottom.png',
  './assets/space-skybox/front.png',
  './assets/space-skybox/back.png',
];
scene.background = new THREE.CubeTextureLoader().load(
  skyboxFaces,
  undefined,
  undefined,
  (error) => console.error('Failed to load cubemap skybox images.', error)
);
scene.background.colorSpace = THREE.SRGBColorSpace;
const pCam = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
const mainRenderer = new THREE.WebGLRenderer({antialias: true});
const mainCharacter = new character.Character(scene);

const externalCamera = new character.externalCamera(scene, pCam, mainRenderer, mainCharacter);

//const orbitControls = new character.Camera(scene, pCam, mainRenderer, mainCharacter);
const canvas = mainRenderer.domElement;
canvas.setAttribute('tabindex', 0);
const gameInput = new input.Input(canvas, mainCharacter, externalCamera);

/*---------------------------//
    RENDERER INITIALISATION
//---------------------------*/

const div_2D = document.getElementById('HTML');
const div_mainScreen = document.getElementsByClassName('main-screen')[0];

mainRenderer.setSize(window.innerWidth, window.innerHeight);
mainRenderer.setAnimationLoop(render);
mainRenderer.setPixelRatio(window.devicePixelRatio);

div_mainScreen.appendChild(mainRenderer.domElement);

// HTML Renderer Lower Toolbar
const HTMLRenderer = new CSS2DRenderer();
HTMLRenderer.setSize(window.innerWidth, window.innerHeight);
HTMLRenderer.domElement.style.position = 'absolute';
HTMLRenderer.domElement.style.top = '0';
HTMLRenderer.domElement.style.left = '0';
HTMLRenderer.domElement.style.pointerEvents = 'none';

// 2D/HTML elements
div_2D.appendChild(HTMLRenderer.domElement);

const lower_toolbar = document.getElementById('lower-toolbar');

const placeableTemplates = new Map();
const placeableMixers = new Set();
const animationClock = new THREE.Clock();
let activePlaceable = null;
let hasPlacementPosition = false;

// Cube rendered to camera to render as 2D

const HUD = new hud.HUD(scene, pCam);
HUD.setupBuildMenu((itemId) => {
  const template = placeableTemplates.get(itemId);
  if (!template || activePlaceable) return false;

  activePlaceable = template.scene.clone(true);
  activePlaceable.visible = false;
  hasPlacementPosition = false;
  if (template.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(activePlaceable);
    for (const clip of template.animations) {
      mixer.clipAction(clip).play();
    }
    placeableMixers.add(mixer);
  }
  scene.add(activePlaceable);
  gameInput.previewPlacement_b = true;
  return true;
});
gameInput.onPlacementConfirm = () => {
  if (!activePlaceable || !hasPlacementPosition) return false;

  gameObjects.push(activePlaceable);
  activePlaceable = null;
  hasPlacementPosition = false;
  return true;
};
scene.add(pCam);

/*---------------------------//
        MISC GEOMETRY
//---------------------------*/



// Plane
const groundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(100,100),
  new THREE.MeshPhongMaterial({
    map: groundPlaneTexture,
    side: THREE.DoubleSide,
  })
)
groundPlane.rotateX(Math.PI/2)
scene.add(groundPlane);
gameObjects.push(groundPlane);

// Lighting

class ColorGUIHelper {
  constructor(object, prop) {
    this.object = object;
    this.prop = prop;
  }
  get value() {
    return '#' + this.object[this.prop].getHexString();
  }
  set value(hexString) {
    this.object[this.prop].set(hexString);
  }
}

const color = 0xFFFFFF;
const intensity = 4;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light)

lilgui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color');
lilgui.add(light, 'intensity', 0, 5, 0.01);

// Placeable asset templates
modelLoader.load('./assets/jack_pump/scene.gltf', function(gltf){
  placeableTemplates.set('jack-pump', {
    scene: gltf.scene,
    animations: gltf.animations,
  });
  HUD.setBuildItemAvailable('jack-pump', true);
}, undefined, function(error){
  console.error(error);
});

const raycaster = new THREE.Raycaster();
let pointer2D = new THREE.Vector2();
let previewObject = null;

function updatePlacementPreview(event) {
  // Only detect cursor if its on the main window.
  const bounds = canvas.getBoundingClientRect();

  // Make sure the cursor is placed over the ground plane
  if (!previewObject || bounds.width === 0 || bounds.height === 0) return;

  // eg (x - bounds) / resolution --> scaled to (-1 -> 1)
  pointer2D.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer2D.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  
  // Set gradient of ray line from camera to cursor
  // (line1)
  raycaster.setFromCamera(pointer2D, pCam);

  // Extend magnitude until object is hit.
  // (line2)
  const intersects = raycaster.intersectObject(groundPlane);
  if (intersects.length === 0) return;

  // Vector 3 position
  const hitPoint = intersects[0].point;

  previewObject.position.set(hitPoint.x, hitPoint.y + 0.5, hitPoint.z);
  previewObject.visible = true;
  hasPlacementPosition = true;
}

function previewPlacement(object, enabled) {
  const nextPreviewObject = enabled ? object : null;
  if (nextPreviewObject === previewObject) return;

  canvas.removeEventListener('pointermove', updatePlacementPreview);
  previewObject = nextPreviewObject;
  if (previewObject) {
    canvas.addEventListener('pointermove', updatePlacementPreview);
  }
}

/*---------------------------//
       MAIN RENDER LOOP
//---------------------------*/

function resizeRendererToDisplaySize(renderer) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if ((window.innerWidth != canvas.width) || (window.innerHeight != height)) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    pCam.aspect = canvas.clientWidth / canvas.clientHeight;
    pCam.updateProjectionMatrix();
	}

}

function render( time ) {
  resizeRendererToDisplaySize(mainRenderer);
  resizeRendererToDisplaySize(HTMLRenderer);
  const delta = animationClock.getDelta();
  gameInput.update(delta, mainCharacter, externalCamera);
  mainCharacter.update(delta, gameInput.velocity);
  for (const mixer of placeableMixers) {
    mixer.update(delta);
  }

  previewPlacement(activePlaceable, gameInput.previewPlacement_b);

  //orbitControls.animate(mainCharacter.character);
  externalCamera.animate();


  mainRenderer.render( scene, pCam );
  HTMLRenderer.render( scene, pCam );
}
