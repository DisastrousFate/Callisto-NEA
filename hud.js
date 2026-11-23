/*---------------------------//
       HUD AND MENUS
//---------------------------*/

import { buildItems } from './game.js';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';


export class HUD {
    constructor(scene = THREE.Scene, camera = THREE.Camera){
        this.scene = scene;
        this.camera = camera;
    }

    /*---------------------------//
             BUILD MENU
    //---------------------------*/

    setupBuildMenu(onPlace){ // placement callback
        this.buildMenu = document.getElementById('build-menu-div');
        this.buildMenuButton = document.getElementById('lower-menu-button');
        this.buildItemPreview = this.buildMenu?.querySelector('.build-item-preview'); // optional menu
        this.buildPlaceButton = this.buildMenu?.querySelector('.build-place-button');
        this.buildItemButtons = [];
        if (this.buildMenu) {
            const buttons = this.buildMenu.querySelectorAll('[data-build-item]'); // item buttons
            for (let index = 0; index < buttons.length; index++) {
                this.buildItemButtons.push(buttons[index]);
            }
        }

        if (!this.buildMenu || !this.buildMenuButton || !this.buildItemPreview || // required controls
            !this.buildPlaceButton || this.buildItemButtons.length === 0){
            throw new Error('Build menu markup is missing required elements.');
        }

        this.selectedBuildItem = null; // no selection

        this.buildMenuButton.addEventListener('click', () => { // toggle build
            this.buildMenu.classList.toggle('is-hidden');
            this.inventoryMenu?.classList.add('is-hidden'); // hide inventory
        });

        // item details
        this.buildItemButtons.forEach((button) => {
            const item = buildItems[button.dataset.buildItem]; // use the id from the button
            button.textContent = item.name;
            button.addEventListener('click', () => {
                if (button.disabled) return; // locked item
                this.selectedBuildItem = button.dataset.buildItem;
                this.buildItemPreview.textContent = item.name + ' — ' + item.cost + ' iridium'; // price preview
                this.buildPlaceButton.disabled = false; // enable placement
            });
        });

        this.buildPlaceButton.addEventListener('click', () => {
            if (!this.selectedBuildItem || onPlace(this.selectedBuildItem) === false) return; // start preview if an item is selected
            this.buildMenu.classList.add('is-hidden'); // hide menu
        });
    }

    /*---------------------------//
         OTHER MENU BUTTONS
    //---------------------------*/

    // button actions
    setupGameMenus(game, onSwitch){
        this.inventoryMenu = document.getElementById('inventory-menu-div');
        document.getElementById('inventory-menu-button').addEventListener('click', () => { // toggle inventory
            this.inventoryMenu.classList.toggle('is-hidden');
            this.buildMenu.classList.add('is-hidden'); // hide build
        });
        document.getElementById('close-inventory').addEventListener('click', () => this.inventoryMenu.classList.add('is-hidden'));
        document.getElementById('close-build').addEventListener('click', () => this.buildMenu.classList.add('is-hidden'));
        document.getElementById('train-soldier').addEventListener('click', function() { game.trainSoldier(); });
        document.getElementById('attack-button').addEventListener('click', function() { game.attack(); });
        document.getElementById('switch-team').addEventListener('click', onSwitch); // switch callback
        this.status = document.getElementById('game-status');
        this.message = document.getElementById('game-message');
        this.inventoryContents = document.getElementById('inventory-contents');
        this.healthBar = document.getElementById('health-bar');
    }

    /*---------------------------//
           HEALTH AND INVENTORY
    //---------------------------*/

    // active team
    updateGame(game){
        const player = game.player;
        let name = 'Blue';
        if (player.team === 1) name = 'Red'; // red label

        let soldiers = 0;
        for (const soldier of game.soldiers) {
            if (soldier.team === player.team) soldiers++; // count allies
        }
        // status text
        let status = name + ' team | Health ' + player.health + '/100';
        status += ' | Iridium ' + player.Inventory.iridium;
        status += ' | Soldiers ' + soldiers + '/5';
        status += ' | Enemy health ' + game.players[1 - player.team].health + '/100'; // opposing health
        if (player.health === 0) {
            if (game.buildings.some(building => building.team === player.team && building.type === 'respawn-beacon' && building.health > 0)) { // surviving beacon
                status += ' | Respawning in ' + Math.ceil(player.respawnTimer) + 's'; // round up the seconds left
            } else {
                status += ' | No respawn beacon — switch teams or reload to restart';
            }
        }

        let inventory = name + ' inventory: ' + player.Inventory.iridium + ' iridium.'; // team balance
        // only change text when needed
        if (this.status.textContent !== status) this.status.textContent = status;
        if (this.message.textContent !== game.message) this.message.textContent = game.message;
        if (this.inventoryContents.textContent !== inventory) this.inventoryContents.textContent = inventory;
        this.healthBar.value = player.health; // health meter
    }

    setBuildItemAvailable(itemId, available){
        const button = this.buildItemButtons.find((item) => item.dataset.buildItem === itemId); // button lookup

        if (!button) {
            throw new Error(`Unknown build item: ${itemId}`);
        }

        button.disabled = !available; // toggle availability
    }




}

// cube test
// const geometry2d = new THREE.BoxGeometry(1, 1, 1);
// const material2d = new THREE.MeshBasicMaterial({ color: 'white' });
// const cube2d = new THREE.Mesh(geometry2d, material2d);
// camera.add(cube2d);
