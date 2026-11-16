/*---------------------------//
       HUD AND MENUS
//---------------------------*/

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

    setupBuildMenu(buildItems, onPlace){
        this.buildMenu = document.getElementById('build-menu-div');
        this.buildMenuButton = document.getElementById('lower-menu-button');
        this.buildItemPreview = this.buildMenu?.querySelector('.build-item-preview'); // ? avoids undefined errors.
        this.buildPlaceButton = this.buildMenu?.querySelector('.build-place-button');
        this.buildItemButtons = [];
        if (this.buildMenu) {
            const buttons = this.buildMenu.querySelectorAll('[data-build-item]');
            for (let index = 0; index < buttons.length; index++) {
                this.buildItemButtons.push(buttons[index]);
            }
        }

        if (!this.buildMenu || !this.buildMenuButton || !this.buildItemPreview ||
            !this.buildPlaceButton || this.buildItemButtons.length === 0){
            throw new Error('Build menu markup is missing required elements.');
        }

        this.selectedBuildItem = null;

        this.buildMenuButton.addEventListener('click', () => {
            this.buildMenu.classList.toggle('is-hidden');
            this.inventoryMenu?.classList.add('is-hidden');
        });

        // Match each button's item ID to the name and price in the JSON file.
        for (const button of this.buildItemButtons) {
            const item = buildItems[button.dataset.buildItem];
            button.textContent = item.name;
            button.addEventListener('click', () => {
                if (button.disabled) return;
                this.selectedBuildItem = button.dataset.buildItem;
                this.buildItemPreview.textContent = item.name + ' — ' + item.cost + ' iridium';
                this.buildPlaceButton.disabled = false;
            });
        }

        const pump = buildItems['jack-pump'];
        const beacon = buildItems['respawn-beacon'];
        const barracks = buildItems['barracks'];
        document.getElementById('building-costs').textContent =
            pump.name + ': ' + pump.cost + ' iridium, produces ' + pump.production.iridium +
            ' every ' + pump.production.seconds + 's near purple nodes. ' +
            beacon.name + ': ' + beacon.cost + '. ' + barracks.name + ': ' + barracks.cost + '. Soldier: 20.';

        this.buildPlaceButton.addEventListener('click', () => {
            if (!this.selectedBuildItem || onPlace(this.selectedBuildItem) === false) return;
            this.buildMenu.classList.add('is-hidden');
        });
    }

    /*---------------------------//
         OTHER MENU BUTTONS
    //---------------------------*/

    // These buttons call the rules in game.js. The HUD only displays the result.
    setupGameMenus(game, onSwitch){
        this.inventoryMenu = document.getElementById('inventory-menu-div');
        document.getElementById('inventory-menu-button').addEventListener('click', () => {
            this.inventoryMenu.classList.toggle('is-hidden');
            this.buildMenu.classList.add('is-hidden');
        });
        document.getElementById('close-inventory').addEventListener('click', () => this.inventoryMenu.classList.add('is-hidden'));
        document.getElementById('close-build').addEventListener('click', () => this.buildMenu.classList.add('is-hidden'));
        document.getElementById('train-soldier').addEventListener('click', () => game.trainSoldier());
        document.getElementById('attack-button').addEventListener('click', () => game.attack());
        document.getElementById('recycle-button').addEventListener('click', () => game.recycleBuilding());
        document.getElementById('switch-team').addEventListener('click', onSwitch);
        this.status = document.getElementById('game-status');
        this.message = document.getElementById('game-message');
        this.inventoryContents = document.getElementById('inventory-contents');
        this.healthBar = document.getElementById('health-bar');
    }

    /*---------------------------//
           HEALTH AND INVENTORY
    //---------------------------*/

    // HUD notes:
    // Need the current team's totals, not both teams added together.
    // It is only displaying the inventory; spending happens in game.js.
    updateGame(game){
        const player = game.player;
        let name = 'Blue';
        if (player.team === 1) name = 'Red';

        // Count the team's objects once, instead of filtering the list for each label.
        // Start these again each update, otherwise they would keep counting upwards.
        let soldiers = 0;
        let pumps = 0;
        let barracks = 0;
        let beacons = 0;
        for (const soldier of game.soldiers) {
            if (soldier.team === player.team) soldiers++;
        }
        for (const building of game.buildings) {
            if (building.team !== player.team) continue;
            if (building.type === 'jack-pump') pumps++;
            if (building.type === 'barracks') barracks++;
            if (building.type === 'respawn-beacon') beacons++;
        }

        // Build the text in parts here so it is easier to see which value goes where.
        let status = name + ' team | Health ' + player.health + '/100';
        status += ' | Iridium ' + player.Inventory.iridium;
        status += ' | Soldiers ' + soldiers + '/5';
        status += ' | Enemy health ' + game.players[1 - player.team].health + '/100';
        if (player.health === 0) {
            if (beacons > 0) {
                status += ' | Respawning in ' + Math.ceil(player.respawnTimer) + 's';
            } else {
                status += ' | No respawn beacon — switch teams or reload to restart';
            }
        }

        let inventory = name + ' inventory: ' + player.Inventory.iridium + ' iridium.';
        inventory += ' Pumps: ' + pumps + '. Barracks: ' + barracks;
        inventory += '. Respawn beacons: ' + beacons + '.';

        // Only replace text when a value changes, rather than on every frame.
        if (this.status.textContent !== status) this.status.textContent = status;
        if (this.message.textContent !== game.message) this.message.textContent = game.message;
        if (this.inventoryContents.textContent !== inventory) this.inventoryContents.textContent = inventory;
        this.healthBar.value = player.health;
    }

    setBuildItemAvailable(itemId, available){
        const button = this.buildItemButtons.find((item) => item.dataset.buildItem === itemId);

        if (!button) {
            throw new Error(`Unknown build item: ${itemId}`);
        }

        button.disabled = !available;
    }




}

// Earlier HUD cube test, kept here for reference.
// Cube rendered to camera to render as 2D
// const geometry2d = new THREE.BoxGeometry(1, 1, 1);
// const material2d = new THREE.MeshBasicMaterial({ color: 'white' });
// const cube2d = new THREE.Mesh(geometry2d, material2d);
// camera.add(cube2d);
