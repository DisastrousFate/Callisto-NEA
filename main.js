import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import { FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';

import * as graphics from './graphics.js';
import * as hud from './hud.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );

const div_2D = document.getElementById('HTML');
const div_mainScreen = document.getElementsByClassName('main-screen')[0];

// 3D Graphics Renderer

const mainRenderer = new THREE.WebGLRenderer({antialias: true});
const canvas = mainRenderer.domElement

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

const lower_toolbar = document.createElement('div');
div_2D.appendChild(lower_toolbar);
lower_toolbar.setAttribute('id', 'lower-toolbar');

const lowerToolbarText = document.createElement('h1');
lowerToolbarText.innerHTML = 'Lower Toolbar'
lower_toolbar.appendChild(lowerToolbarText);


// Cube rendered to camera to render as 2D

const HUD = new hud.HUD(scene, camera)
HUD.square();
scene.add(camera)


// Cube
const geometry = new THREE.BoxGeometry( .5, .5, .5 );
const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
const cube = new THREE.Mesh( geometry, material );

const label1 = new graphics.TextLabel('Cube', lower_toolbar);
cube.add(label1.textObject);
scene.add( cube );

const geometry2 = new THREE.CircleGeometry(2, 32, 0, Math.PI * 2);
const material2 = new THREE.MeshBasicMaterial({color: 0xffff00}, {side: THREE.DoubleSide});
const circle = new THREE.Mesh(geometry2, material2);

const label2 = new graphics.TextLabel('Circle', lower_toolbar, 'black');
circle.add(label2.textObject);
//scene.add(circle);

// Line
const line1 = new graphics.Line();
scene.add(line1.line);

camera.position.z = 5;

function resizeRendererToDisplaySize(renderer) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if ((window.innerWidth != canvas.width) || (window.innerHeight != height)) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
	}

}

function render( time ) {
  
  resizeRendererToDisplaySize(mainRenderer)
  resizeRendererToDisplaySize(HTMLRenderer)

  
  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;
  cube.translateZ(0.01);
  cube.castShadow = true;

  mainRenderer.render( scene, camera );
  HTMLRenderer.render( scene, camera );
}