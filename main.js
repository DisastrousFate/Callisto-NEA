import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import { FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';

import * as graphics from './graphics.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );

const div_2D = document.getElementById('HTML');
const div_mainScreen = document.getElementsByClassName('main-screen')[0];

// 3D Graphics Renderer

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
div_mainScreen.appendChild( renderer.domElement );

// HTML Renderer Lower Toolbar

const HTMLRenderer = new CSS2DRenderer();
HTMLRenderer.setSize(window.innerWidth, window.innerHeight);
HTMLRenderer.domElement.style.position = 'absolute';
HTMLRenderer.domElement.style.top = '0';
HTMLRenderer.domElement.style.left = '0';
HTMLRenderer.domElement.style.pointerEvents = 'none';
div_2D.appendChild(HTMLRenderer.domElement);

const lower_toolbar = document.createElement('div');
div_2D.appendChild(lower_toolbar);
lower_toolbar.setAttribute('id', 'lower-toolbar');

const label1 = new graphics.TextLabel('Cube', lower_toolbar);

// Cube
const geometry = new THREE.BoxGeometry( .5, .5, .5 );
const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
const cube = new THREE.Mesh( geometry, material );

// cube.add(text1);
cube.add(label1.textObject);

scene.add( cube );

const geometry2 = new THREE.CircleGeometry(2, 32, 0, Math.PI * 2);
const material2 = new THREE.MeshBasicMaterial({ color: 0xffff00 }, { side: THREE.DoubleSide });
const circle = new THREE.Mesh(geometry2, material2);

const label2 = new graphics.TextLabel('Circle', lower_toolbar, 'black');
circle.add(label2.textObject);
scene.add(circle);

camera.position.z = 5;

function animate( time ) {

  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;
  cube.translateZ(0.01);
  cube.castShadow = true;

  renderer.render( scene, camera );
  HTMLRenderer.render( scene, camera );
}