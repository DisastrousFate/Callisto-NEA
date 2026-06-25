import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );

// 3D Graphics Renderer

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.getElementsByClassName('main-screen')[0].appendChild( renderer.domElement );

// HTML Renderer Lower Toolbar

const HTMLRendererLower = new CSS2DRenderer();
HTMLRendererLower.domElement = document.getElementById('lower-toolbar');
HTMLRendererLower.sortObjects = false;

// HTML Renderer Side Toolbar

const HTMLRendererSide = new CSS2DRenderer();
HTMLRendererSide.domElement = document.getElementById('side-toolbar');

// Cube
const geometry = new THREE.BoxGeometry( 2, 2, 2 );
const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

const geometry2 = new THREE.CircleGeometry(2, 32, 0, Math.PI * 2);
const material2 = new THREE.MeshBasicMaterial({ color: 0xffff00 }, { side: THREE.DoubleSide });
const circle = new THREE.Mesh(geometry2, material2);
scene.add(circle);

camera.position.z = 5;

function animate( time ) {

  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;
  cube.translateZ(0.01);
  cube.castShadow = true;


  renderer.render( scene, camera );
  HTMLRendererLower.render( scene, camera );

}