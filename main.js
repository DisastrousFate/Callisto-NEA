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

const texLoader = new THREE.TextureLoader();
const modelLoader = new GLTFLoader();

const groundPlaneTexture = texLoader.load("./checker.png");
groundPlaneTexture.wrapS = THREE.RepeatWrapping;
groundPlaneTexture.wrapT = THREE.RepeatWrapping;
groundPlaneTexture.magFilter = THREE.NearestFilter;
groundPlaneTexture.colorSpace = THREE.SRGBColorSpace;
const repeats = 100/2;
groundPlaneTexture.repeat.set(repeats,repeats); // X, Y

const scene = new THREE.Scene();
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

const build_menu_button_div = document.createElement('div');
build_menu_button_div.id = 'lower-menu-button_div';
lower_toolbar.appendChild(build_menu_button_div);

const build_menu_button = document.createElement('p');
build_menu_button.id = 'lower-menu-button'
build_menu_button.innerHTML = 'Build';
build_menu_button.style.backgroundColor = 'White'
build_menu_button_div.appendChild(build_menu_button);

const inventory_menu_button_div = document.createElement('div');
inventory_menu_button_div.id = 'lower-menu-button_div';
lower_toolbar.appendChild(inventory_menu_button_div);

const inventory_menu_button = document.createElement('p');
inventory_menu_button.id = 'lower-menu-button'
inventory_menu_button.innerHTML = 'Inventory';
inventory_menu_button.style.backgroundColor = 'White'
inventory_menu_button_div.appendChild(inventory_menu_button);

// const lowerToolbarText = document.createElement('h1');
// lowerToolbarText.innerHTML = 'Lower Toolbar';
// lower_toolbar.appendChild(lowerToolbarText);


// Cube rendered to camera to render as 2D

const HUD = new hud.HUD(scene, pCam);
HUD.square();
scene.add(pCam);

/*---------------------------//
        MISC GEOMETRY
//---------------------------*/

// Cube
const geometry = new THREE.BoxGeometry( .5, .5, .5 );
const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
const cube = new THREE.Mesh( geometry, material );

const label1 = new graphics.TextLabel('Cube', lower_toolbar);
cube.add(label1.textObject);
scene.add( cube );
gameObjects.push(cube);

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

// Placement - Oil Pump
let jackPump;

modelLoader.load('./assets/jack_pump/scene.gltf', function(gltf){
  jackPump = gltf.scene;
  gameObjects.push(jackPump);
  scene.add(jackPump);
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

  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;
  cube.translateZ(0.01);
  cube.castShadow = true;

  previewPlacement(jackPump, gameInput.previewPlacement_b);

  //orbitControls.animate(mainCharacter.character);
  externalCamera.animate();


  mainRenderer.render( scene, pCam );
  HTMLRenderer.render( scene, pCam );
}
