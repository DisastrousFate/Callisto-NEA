/*---------------------------//
      IMPORTED LIBRARIES
//---------------------------*/

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import { buildMesh, FontLoader, GLTFLoader, TextGeometry, ThreeMFLoader } from 'three/examples/jsm/Addons.js';


/*---------------------------//
  SHARED VARIABLE DEFINITIONS
//---------------------------*/

const gameObjects = [];
export {gameObjects};

/*---------------------------//
           MODULES
//---------------------------*/

import * as hud from './hud.js';
import * as character from './character.js';
import * as input from './input.js';
import { cameraFar, texture } from 'three/tsl';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { objectGroup } from 'three/tsl';
import { Game } from './game.js';

/*---------------------------//
        LOAD THE ASSET FILE
//---------------------------*/

// Get the file as text first, then turn that text into an object.
const response = await fetch('./assets.json');
if (!response.ok) {
  throw new Error('Could not load assets.json. HTTP status: ' + response.status);
}
const assetText = await response.text();
const assetData = JSON.parse(assetText);
const buildItems = assetData.buildItems;

/*---------------------------//
        LOCAL VARIABLES
//---------------------------*/

const modelLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const groundTexturePath = assetData.terrain.texture;
const groundTextureRepeat = assetData.terrain.textureRepeat;
const groundPlaneTexture = textureLoader.load(groundTexturePath);
groundPlaneTexture.colorSpace = THREE.SRGBColorSpace;
groundPlaneTexture.wrapS = THREE.RepeatWrapping;
groundPlaneTexture.wrapT = THREE.RepeatWrapping;
groundPlaneTexture.repeat.set(groundTextureRepeat, groundTextureRepeat)

const scene = new THREE.Scene();
scene.background = new THREE.CubeTextureLoader().load(
  assetData.skyboxFaces,
  undefined,
  undefined,
  (error) => console.error('Failed to load cubemap skybox images.', error)
);

scene.background.colorSpace = THREE.SRGBColorSpace;
const pCam = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
const mainRenderer = new THREE.WebGLRenderer({antialias: true});
const mainCharacter = new character.Character(scene, assetData.astronaut);

//-------------REVIEW--------------//

const game = new Game(assetData);
mainCharacter.character.position.set(game.player.x, 0, game.player.z); // set directly on plane
const teamColors = [0x4b9bff, 0xf06464]; // blue, red


// game.buildings = its team, health, position
// buildingMeshes = 3d mesh drawn

const buildingMeshes = new Map();
const soldierMeshes = new Map();
let activeItemId = null;

//---------------------------//

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

/*---------------------------//
    BUILD MENU AND INPUT
//---------------------------*/

//-------------REVIEW--------------//

// The menu starts the preview. E confirms it after the pointer finds the ground.
const HUD = new hud.HUD(scene, pCam);
HUD.setupBuildMenu(buildItems, (itemId) => {
  const template = placeableTemplates.get(itemId);
  if (!template || activePlaceable || game.player.health <= 0) return false;
  activeItemId = itemId;

  if (template.scene) {
    activePlaceable = template.scene.clone(true);
  } else {
    activePlaceable = makeBuilding(itemId, game.activeTeam);
  }
  // Hide it until the raycast has found somewhere to put it.
  // Otherwise it briefly appears at (0,0,0).

  //---------------------------//

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

//-------------REVIEW--------------//

gameInput.onPlacementConfirm = () => {
  if (!activePlaceable || !hasPlacementPosition) return false;

  if (!game.placeBuilding(activeItemId, activePlaceable.position.x, activePlaceable.position.z)) return false;
  // placeBuilding just added the record, so the last one belongs to this preview.
  const building = game.buildings[game.buildings.length - 1];
  buildingMeshes.set(building.id, activePlaceable);
  // Preview becomes the real placed object here.
  // Do not remove it from the scene - just stop treating it as a preview.
  gameObjects.push(activePlaceable);
  activePlaceable = null;
  activeItemId = null;
  hasPlacementPosition = false;
  return true;
};
gameInput.onPlacementCancel = cancelPlacement;
gameInput.onAttack = () => game.attack();
HUD.setupGameMenus(game, () => {
  cancelPlacement();
  // Only two teams for now, so 1 - 0 gives 1 and 1 - 1 gives 0.
  game.activeTeam = 1 - game.activeTeam;
  game.message = (game.activeTeam === 0 ? 'Blue' : 'Red') + ' team selected.';
  mainCharacter.character.position.set(game.player.x, 0, game.player.z);
  // Clear held movement, so switching teams does not slide the other player around.
  gameInput.keys.clear();
  gameInput.velocity.set(0, 0, 0);
});
scene.add(pCam);

//---------------------------//

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

const color = 0xFFFFFF;
const intensity = 4;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light)

//-------------REVIEW--------------//


/*---------------------------//
  LOADING BUILDING MODELS
//---------------------------*/

// Load each model once. Items without a model use the simple shapes below.
for (const itemId of Object.keys(buildItems)) {
  const item = buildItems[itemId];
  if (!item.model) {
    placeableTemplates.set(itemId, { scene: null, animations: [] });
    HUD.setBuildItemAvailable(itemId, true);
    continue;
  }

  modelLoader.load(item.model, function(gltf){
    // Scale the longest side to the size in assets.json.
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = item.modelSize / Math.max(size.x, size.y, size.z);
    gltf.scene.scale.setScalar(scale);
    gltf.scene.position.set(
      -(bounds.min.x + bounds.max.x) * scale / 2,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * scale / 2
    );

    // Move the whole group when placing it, keeping the animation inside.
    const model = new THREE.Group();
    model.add(gltf.scene);
    placeableTemplates.set(itemId, { scene: model, animations: gltf.animations });
    HUD.setBuildItemAvailable(itemId, true);
  }, undefined, function(error){
    console.error(error);
    // Let the player build with a placeholder if the model fails to load.
    placeableTemplates.set(itemId, { scene: null, animations: [] });
    HUD.setBuildItemAvailable(itemId, true);
  });
}
for (const node of game.resourceNodes) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 0.3, 12), new THREE.MeshPhongMaterial({ color: 0xad62e8 }));
  mesh.position.set(node.x, 0.15, node.z);
  scene.add(mesh);
}
const rival = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), new THREE.MeshPhongMaterial({ color: teamColors[1] }));
scene.add(rival);

/*---------------------------//
   PLACEHOLDER BUILDINGS
//---------------------------*/

// Basic shapes for now. The beacon has a pole and the barracks is a taller box.
// Placeholder idea:
// barracks -> box
// beacon -> short base + pole
// Proper models could replace these later without changing the game rules.
function makeBuilding(type, team) {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ color: teamColors[team] });
  let height = 0.5;
  if (type === 'barracks') height = 1.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, height, 2.5), material);
  body.position.y = height / 2; // The origin is in the middle, so lift the base above ground.
  group.add(body);
  if (type !== 'barracks') {
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
    scene.remove(activePlaceable);
    stopBuildingAnimation(activePlaceable);
  }
  activePlaceable = null;
  activeItemId = null;
  hasPlacementPosition = false;
  gameInput.previewPlacement_b = false;
}

// Stop updating the pump animation when its object is removed.
function stopBuildingAnimation(object) {
  for (const mixer of placeableMixers) {
    if (mixer.getRoot() === object) {
      mixer.stopAllAction();
      placeableMixers.delete(mixer);
    }
  }
}

/*---------------------------//
     UPDATING THE SCENE
//---------------------------*/

// The Maps link game records to their meshes. They avoid making new meshes every frame.
function updateGameMeshes() {
  // Remove meshes whose building records no longer exist.
  for (const [id, mesh] of buildingMeshes) {
    if (game.buildings.some((building) => building.id === id)) continue;
    scene.remove(mesh);
    const index = gameObjects.indexOf(mesh);
    if (index >= 0) gameObjects.splice(index, 1);
    stopBuildingAnimation(mesh);
    buildingMeshes.delete(id);
  }
  // Add meshes for buildings which do not have one yet.
  for (const building of game.buildings) {
    if (buildingMeshes.has(building.id)) continue;
    const mesh = makeBuilding(building.type, building.team);
    mesh.position.set(building.x, 0, building.z);
    scene.add(mesh);
    buildingMeshes.set(building.id, mesh);
  }
  // Same idea for soldiers: remove defeated ones, then move the survivors.
  for (const [soldier, mesh] of soldierMeshes) {
    if (game.soldiers.includes(soldier)) continue;
    scene.remove(mesh);
    // Taking it out of the scene does not free the geometry by itself.
    // These little soldier meshes are created individually, so they can be disposed here.
    mesh.geometry.dispose();
    mesh.material.dispose();
    soldierMeshes.delete(soldier);
  }
  for (const soldier of game.soldiers) {
    if (!soldierMeshes.has(soldier)) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshPhongMaterial({ color: teamColors[soldier.team] }));
      scene.add(mesh);
      soldierMeshes.set(soldier, mesh);
    }
    soldierMeshes.get(soldier).position.set(soldier.x, 0.5, soldier.z);
  }
  const otherPlayer = game.players[1 - game.activeTeam];
  rival.position.set(otherPlayer.x, 0.9, otherPlayer.z);
  rival.material.color.setHex(teamColors[otherPlayer.team]);
  rival.visible = otherPlayer.health > 0;
  mainCharacter.character.visible = game.player.health > 0;
}

//---------------------------//


/*---------------------------//
      CURSOR PLACEMENT
//---------------------------*/



const raycaster = new THREE.Raycaster();
let pointer2D = new THREE.Vector2();
let previewObject = null;
const GRID_SIZE = 1; // world units per grid cell

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
  if (intersects.length === 0) {
    previewObject.visible = false;
    hasPlacementPosition = false;
    return;
  }

  // Vector 3 position
  const hitPoint = intersects[0].point;

  //previewObject.position.set(hitPoint.x, hitPoint.y + 0.5, hitPoint.z);

  // Example with GRID_SIZE = 1:
  // 3.2 -> 3, 3.7 -> 4
  // Keep the old unsnapped line above for reference.
  const snappedX = Math.round(hitPoint.x / GRID_SIZE) * GRID_SIZE;
  const snappedZ = Math.round(hitPoint.z / GRID_SIZE) * GRID_SIZE;

  previewObject.position.set(snappedX, hitPoint.y, snappedZ);
  previewObject.visible = true;
  const error = game.placementError(activeItemId, snappedX, snappedZ);
  if (error) {
    hasPlacementPosition = false;
    game.message = error;
  } else {
    hasPlacementPosition = true;
    game.message = 'Press E to place, Esc to cancel.';
  }
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

canvas.addEventListener('pointerleave', () => {
  hasPlacementPosition = false;
  if (previewObject) previewObject.visible = false;
});

function resizeRendererToDisplaySize(renderer) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if ((window.innerWidth != canvas.width) || (window.innerHeight != height)) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    HTMLRenderer.setSize(window.innerWidth, window.innerHeight);
    pCam.aspect = canvas.clientWidth / canvas.clientHeight;
    pCam.updateProjectionMatrix();
	}

}

function render( time ) {
  resizeRendererToDisplaySize(mainRenderer);
  resizeRendererToDisplaySize(HTMLRenderer);

  const delta = Math.min(animationClock.getDelta(), 0.1);
  if (game.player.health > 0) {
    gameInput.update(delta, mainCharacter, externalCamera);

    // Save the new position before the game copies it back onto the model.
    // Keep x and z on the ground plane.
    const position = mainCharacter.character.position;
    game.player.x = Math.max(-49, Math.min(49, position.x));
    game.player.z = Math.max(-49, Math.min(49, position.z));
  } else {
    gameInput.velocity.set(0, 0, 0);
    cancelPlacement();
  }

  // Update the rules first, then show the new positions, balances and health.
  // input moves player -> game updates -> meshes and HUD catch up -> render
  game.update(delta);
  mainCharacter.character.position.set(game.player.x, 0, game.player.z);
  updateGameMeshes();
  HUD.updateGame(game);
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
