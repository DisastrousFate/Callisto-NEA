
/*---------------------------//
      IMPORTED LIBRARIES
//---------------------------*/

import * as THREE from 'three';
import { CSS2DRenderer} from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';


const gameObjects = [];
export {gameObjects}; // shared objects

import * as hud from './hud.js';
import * as character from './character.js';
import * as input from './input.js';
import * as game from './game.js';

/*---------------------------//
        LOCAL VARIABLES
//---------------------------*/
          
const modelLoader = new GLTFLoader(); // construct loaders
const textureLoader = new THREE.TextureLoader();

const groundTexturePath = './assets/callisto-ground.png';
const groundTextureRepeat = 20; // tile count
const groundPlaneTexture = textureLoader.load(groundTexturePath); // load terrain

groundPlaneTexture.colorSpace = THREE.SRGBColorSpace; // colour space
groundPlaneTexture.wrapS = THREE.RepeatWrapping;
groundPlaneTexture.wrapT = THREE.RepeatWrapping;

groundPlaneTexture.repeat.set(groundTextureRepeat, groundTextureRepeat); // tile axes

const scene = new THREE.Scene();

const skyboxFaces = [
  "./assets/space-skybox/right.png",
  "./assets/space-skybox/left.png",
  "./assets/space-skybox/top.png",
  "./assets/space-skybox/bottom.png",
  "./assets/space-skybox/front.png",
  "./assets/space-skybox/back.png"
];

scene.background = new THREE.CubeTextureLoader().load( // skybox faces
  skyboxFaces,
  undefined,
  undefined,
  (error) => console.error('Failed to load cubemap skybox images.', error)
);

scene.background.colorSpace = THREE.SRGBColorSpace;

// setups

const pCam = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
const mainRenderer = new THREE.WebGLRenderer({antialias: true}); // smooth edges
const mainCharacter = new character.Character(scene);
const game1 = new game.Game(undefined, character.Character); // default rules
const buildItems = game1.buildItems;

// extra deposits
for (let i = 0; i < 6; i++) { // scatter deposits
  const x = Math.round(Math.random() * 90 - 45); // map bounds
  const z = Math.round(Math.random() * 90 - 45);
  game1.resourceNodes.push({ x: x, z: z, type: 'iridium', amount: 100 });
}

game1.players[0].character = mainCharacter; // link character
mainCharacter.character.position.x = game1.player.x; // set positions
mainCharacter.character.position.z = game1.player.z;
const idleVelocity = new THREE.Vector3(); // 0,0,0
const teamColors = [0x4b9bff, 0xf06464]; // blue, red


// building data
// building visuals

const buildingMeshes = new Map(); // index, value
let activeItemId = null; // selected id

//---------------------------//

const externalCamera = new character.externalCamera(scene, pCam, mainRenderer, mainCharacter); // orbit camera

//const orbitControls = new character.Camera(scene, pCam, mainRenderer, mainCharacter);
const canvas = mainRenderer.domElement;
canvas.setAttribute('tabindex', 0); // allow focus
const gameInput = new input.Input(canvas, mainCharacter, externalCamera); // input setup

/*---------------------------//
    RENDERER INITIALISATION
//---------------------------*/

const div_2D = document.getElementById('HTML'); // html overlay
const div_mainScreen = document.getElementsByClassName('main-screen')[0];

mainRenderer.setSize(window.innerWidth, window.innerHeight);
mainRenderer.setAnimationLoop(render); // frame callback
mainRenderer.setPixelRatio(window.devicePixelRatio); // pixel density

div_mainScreen.appendChild(mainRenderer.domElement); // mount canvas

// overlay renderer
const HTMLRenderer = new CSS2DRenderer(); // draw overlay
HTMLRenderer.setSize(window.innerWidth, window.innerHeight);
HTMLRenderer.domElement.style.position = 'absolute';
HTMLRenderer.domElement.style.top = '0';
HTMLRenderer.domElement.style.left = '0';
HTMLRenderer.domElement.style.pointerEvents = 'none'; // let clicks reach the canvas

// attach overlay
div_2D.appendChild(HTMLRenderer.domElement);

const lower_toolbar = document.getElementById('lower-toolbar');

const buildTemplates = new Map(); // build templates

const placeableMixers = new Set(); // build anims
const animationClock = new THREE.Clock(); // frame timer
let activePlaceable = null;
let hasPlacementPosition = false; // valid spot

/*---------------------------//
    BUILD MENU AND INPUT
//---------------------------*/


const HUD = new hud.HUD(scene, pCam);

// start preview
HUD.setupBuildMenu(function startPlacement(itemId) { // register for later clicks
  const template = buildTemplates.get(itemId); // selected build
  if (!template || activePlaceable || game1.player.health <= 0) return false; // block dead players or duplicate previews
  activeItemId = itemId;

  // preview mesh
  activePlaceable = template.scene ? template.scene.clone(true) : makeBuilding(itemId, game1.activeTeam);
  // hide preview

  // preview anims

  activePlaceable.visible = false; // hide initially
  hasPlacementPosition = false;
  if (template.animations.length > 0) { // check availability
    const mixer = new THREE.AnimationMixer(activePlaceable); // attach animations to this copy
    for (const clip of template.animations) {
      mixer.clipAction(clip).play(); // play clip
    }
    placeableMixers.add(mixer); // track mixer
  }
  scene.add(activePlaceable);
  gameInput.previewPlacement_b = true; // enable placement
  return true;
});


gameInput.onPlacementConfirm = function() { // confirm callback
  if (!activePlaceable || !hasPlacementPosition) return false; // require position

  if (!game1.placeBuilding(activeItemId, activePlaceable.position.x, activePlaceable.position.z)) return false; // check and charge for placement
  // newest building
  const building = game1.buildings[game1.buildings.length - 1];
  buildingMeshes.set(building.id, activePlaceable); // save mesh
  // reuse preview
  gameObjects.push(activePlaceable);
  activePlaceable = null; // clear preview
  activeItemId = null;
  hasPlacementPosition = false;
  return true;
};
gameInput.onPlacementCancel = cancelPlacement;
gameInput.onAttack = function() { game1.attack(); }; // attack callback
HUD.setupGameMenus(game1, function switchTeam() { // switch callback
  cancelPlacement(); // cancel first
  // swap teams
  game1.activeTeam = 1 - game1.activeTeam;
  game1.message = (game1.activeTeam === 0 ? 'Blue' : 'Red') + ' team selected.';
  externalCamera.character = game1.player.character; // follow the other player
  // clear movement
  gameInput.keys.clear();
  gameInput.velocity.set(0, 0, 0);
});
scene.add(pCam);

//---------------------------//

/*---------------------------//
        MISC GEOMETRY
//---------------------------*/

// ground plane
const groundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(100,100),
  new THREE.MeshPhongMaterial({
    map: groundPlaneTexture,
    side: THREE.DoubleSide,
  })
)
groundPlane.rotateX(Math.PI/2) // flatten plane
scene.add(groundPlane);
gameObjects.push(groundPlane);

// lighting

const color = 0xFFFFFF;
const intensity = 4;
const light = new THREE.AmbientLight(color, intensity); // global light
scene.add(light)

/*---------------------------//
  LOADING BUILDING MODELS
//---------------------------*/

function load_builds(location, name){
  const item = buildItems[name];
  modelLoader.load(location, function(gltf){ // load callback
    // fit model
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = item.modelSize / Math.max(size.x, size.y, size.z); // scale to the longest side
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.set( // align model
      -(bounds.min.x + bounds.max.x) * scale / 2, // centre x
      -bounds.min.y * scale, // rest the model on the ground
      -(bounds.min.z + bounds.max.z) * scale / 2 // centre z
    );

    // group model
    const model = new THREE.Group();
    model.add(gltf.scene);
    buildTemplates.set(name, { scene: model, animations: gltf.animations }); // cache template
    HUD.setBuildItemAvailable(name, true); // enable button
  }, undefined, function(error){
    console.error(error);
  });
}

for (const [name, item] of Object.entries(buildItems)) {
  if (item.model) {
    load_builds(item.model, name); // load asset
  } else {
    buildTemplates.set(name, {scene: null, animations: []}); // primitive shape
    HUD.setBuildItemAvailable(name, true);
  }
}

// deposit puddles
modelLoader.load('./assets/pbr_material_puddle/scene.gltf', function(gltf) {
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const puddleY = groundPlane.position.y - bounds.min.y; // align puddle

  // stop flicker
  gltf.scene.traverse(object => {
    if (object.isMesh) {
      object.material.polygonOffset = true; // stop flicker where surfaces overlap
      object.material.polygonOffsetFactor = -1;
      object.material.polygonOffsetUnits = -1;
    }
  });
  for (const node of game1.resourceNodes) {
    const puddle = gltf.scene.clone(true); // duplicate puddle
    puddle.scale.set(2, 1, 2); // widen puddle
    puddle.position.set(node.x, puddleY, node.z);
    scene.add(puddle);
    gameObjects.push(puddle);
  }
});

/*---------------------------//
   BUILDING MODELS
//---------------------------*/

function makeBuilding(type, team) {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ color: teamColors[team] }); // team colour
  let height = 0.5;
  if (type === 'barracks') height = 1.5; // taller barracks
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, height, 2.5), material);
  body.position.y = height / 2; // ground level
  group.add(body);
  if (type !== 'barracks') { // beacon pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2), material);
    pole.position.y = 1.5;
    group.add(pole);
  }
  return group;
}

/*---------------------------//
    REMOVING THE PREVIEW
//---------------------------*/

function cancelPlacement() {
  if (activePlaceable) {
    scene.remove(activePlaceable); // remove preview
    stopBuildingAnimation(activePlaceable);
  }
  activePlaceable = null;
  activeItemId = null;
  hasPlacementPosition = false;
  gameInput.previewPlacement_b = false; // disable placement
}

// stop anim
function stopBuildingAnimation(object) {
  for (const mixer of placeableMixers) {
    if (mixer.getRoot() === object) { // match root
      mixer.stopAllAction();
      placeableMixers.delete(mixer); // drop mixer
    }
  }
}

/*---------------------------//
     UPDATING THE SCENE
//---------------------------*/

const soldierMeshes = new Map();
const soldierShape = new THREE.BoxGeometry(0.6, 1, 0.6); // shared geometry
const soldierMaterials = teamColors.map(color => new THREE.MeshPhongMaterial({color})); // shared materials

function updateSoldierMeshes() {
  for (const [soldier, mesh] of soldierMeshes) {
    if (game1.soldiers.includes(soldier)) continue; // keep meshes for living soldiers
    scene.remove(mesh);
    soldierMeshes.delete(soldier);
  }
  for (const soldier of game1.soldiers) {
    let mesh = soldierMeshes.get(soldier);
    if (!mesh) { // needs mesh
      mesh = new THREE.Mesh(soldierShape, soldierMaterials[soldier.team]);
      scene.add(mesh);
      soldierMeshes.set(soldier, mesh); // remember mesh
    }
    const dx = soldier.x - mesh.position.x; // horizontal change
    const dz = soldier.z - mesh.position.z;
    if (dx || dz) mesh.rotation.y = Math.atan2(dx, dz); // face movement
    mesh.position.set(soldier.x, 0.5, soldier.z); // sync position
  }
}

// mesh lookup
// - sync building and player meshes with the game state
function updateGameMeshes() {
  // destroyed buildings
  for (const [id, mesh] of buildingMeshes) {
    if (game1.buildings.some(building => building.id === id)) continue; // keep standing
    scene.remove(mesh);
    const index = gameObjects.indexOf(mesh);
    if (index >= 0) gameObjects.splice(index, 1); // drop it from the object list
    stopBuildingAnimation(mesh);
    buildingMeshes.delete(id);
  }
  // missing meshes
  for (const building of game1.buildings) {
    if (buildingMeshes.has(building.id) || !buildTemplates.has(building.type)) continue; // skip duplicates
    const mesh = makeBuilding(building.type, building.team);
    mesh.position.set(building.x, 0, building.z);
    scene.add(mesh);
    buildingMeshes.set(building.id, mesh); // track building
  }
  for (const player of game1.players) {
    const mesh = player.character.character;
    mesh.position.x = player.x;
    mesh.position.z = player.z;
    mesh.visible = player.health > 0; // hide dead
  }
}

//---------------------------//


/*---------------------------//
      CURSOR PLACEMENT
//---------------------------*/

const raycaster = new THREE.Raycaster();
let pointer2D = new THREE.Vector2();
let previewObject = null;
const GRID_SIZE = 1; // cell size

// - snap the preview to the ground and check if it can be placed
function updatePlacementPreview(event) {
  // canvas bounds
  const bounds = canvas.getBoundingClientRect();

  // preview checks
  if (!previewObject || bounds.width === 0 || bounds.height === 0) return;

  // normalise cursor
  pointer2D.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer2D.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1; // invert y

  // cursor ray
  // source https://threejs.org/manual/pages/picking.html
  raycaster.setFromCamera(pointer2D, pCam);

  // ground only
  const intersects = raycaster.intersectObject(groundPlane);
  if (intersects.length === 0) { // hide preview off the ground
    previewObject.visible = false;
    hasPlacementPosition = false;
    return;
  }

  // nearest hit
  const hitPoint = intersects[0].point;

  //previewObject.position.set(hitPoint.x, hitPoint.y + 0.5, hitPoint.z);

  // grid snap
  const snappedX = Math.round(hitPoint.x / GRID_SIZE) * GRID_SIZE;
  const snappedZ = Math.round(hitPoint.z / GRID_SIZE) * GRID_SIZE;

  previewObject.position.set(snappedX, hitPoint.y, snappedZ);
  previewObject.visible = true;
  const error = game1.placementError(activeItemId, snappedX, snappedZ); // validate spot
  if (error) {
    hasPlacementPosition = false;
    game1.message = error;
  } else { // valid spot
    hasPlacementPosition = true;
    game1.message = 'Press E to place, Esc to cancel.';
  }
}

function previewPlacement(object, enabled) {
  const nextPreviewObject = enabled ? object : null; // requested preview
  if (nextPreviewObject === previewObject) return; // reuse the current listener

  canvas.removeEventListener('pointermove', updatePlacementPreview); // detach listener
  previewObject = nextPreviewObject;
  if (previewObject) {
    canvas.addEventListener('pointermove', updatePlacementPreview); // track cursor
  }
}

/*---------------------------//
       MAIN RENDER LOOP
//---------------------------*/

canvas.addEventListener('pointerleave', function() { // cursor exits
  hasPlacementPosition = false;
  if (previewObject) previewObject.visible = false;
});

function resizeRendererToDisplaySize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  mainRenderer.setSize(width, height);
  HTMLRenderer.setSize(width, height);
  pCam.aspect = width / height; // camera aspect
  pCam.updateProjectionMatrix(); // apply aspect
}

window.addEventListener('resize', resizeRendererToDisplaySize); // resize callback

function render() {
  const delta = Math.min(animationClock.getDelta(), 0.1); // avoid jumps after slow frames
  if (game1.player.health > 0) { // alive only
    const position = game1.player.character.character.position;
    gameInput.update(delta, position, externalCamera);

    // map limits
    game1.player.x = Math.max(-49, Math.min(49, position.x));
    game1.player.z = Math.max(-49, Math.min(49, position.z));
  } else {
    gameInput.velocity.set(0, 0, 0); // stop movement
    cancelPlacement();
  }

  // rules first
  game1.update(delta);
  updateGameMeshes(); // sync buildings
  updateSoldierMeshes(); // sync soldiers
  HUD.updateGame(game1);
  for (const player of game1.players) {
    player.character.update(delta, player === game1.player ? gameInput.velocity : idleVelocity); // only animate movement for active player
  }
  for (const mixer of placeableMixers) {
    mixer.update(delta); // advance anim
  }

  previewPlacement(activePlaceable, gameInput.previewPlacement_b); // sync preview

  //orbitControls.animate(mainCharacter.character);
  externalCamera.animate(); // follow player


  mainRenderer.render( scene, pCam ); // draw world
  HTMLRenderer.render( scene, pCam ); // draw labels
}
