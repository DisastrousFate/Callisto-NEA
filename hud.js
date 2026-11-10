import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';


export class HUD {
    constructor(scene = THREE.Scene, camera = THREE.Camera){
        this.scene = scene;
        this.camera = camera;
    }

    setupBuildMenu(onPlace){
        this.buildMenu = document.getElementById('build-menu-div');
        this.buildMenuButton = document.getElementById('lower-menu-button');
        this.buildItemPreview = this.buildMenu?.querySelector('.build-item-preview');
        this.buildPlaceButton = this.buildMenu?.querySelector('.build-place-button');
        this.buildItemButtons = this.buildMenu
            ? [...this.buildMenu.querySelectorAll('[data-build-item]')]
            : [];

        if (!this.buildMenu || !this.buildMenuButton || !this.buildItemPreview ||
            !this.buildPlaceButton || this.buildItemButtons.length === 0){
            throw new Error('Build menu markup is missing required elements.');
        }

        this.selectedBuildItem = null;

        this.buildMenuButton.addEventListener('click', () => {
            this.buildMenu.classList.toggle('is-hidden');
        });

        this.buildItemButtons.forEach((button) => {
            button.addEventListener('click', () => {
                if (button.disabled) return;
                this.selectedBuildItem = button.dataset.buildItem;
                this.buildItemPreview.textContent = button.dataset.buildLabel;
                this.buildPlaceButton.disabled = false;
            });
        });

        this.buildPlaceButton.addEventListener('click', () => {
            if (!this.selectedBuildItem || onPlace(this.selectedBuildItem) === false) return;
            this.buildMenu.classList.add('is-hidden');
        });
    }

    setBuildItemAvailable(itemId, available){
        const button = this.buildItemButtons.find((item) => item.dataset.buildItem === itemId);
        if (!button){
            throw new Error(`Unknown build item: ${itemId}`);
        }

        button.disabled = !available;
    }

    square(){
        const geometry = new THREE.PlaneGeometry(.5,.5,1,1);
        const material = new THREE.MeshBasicMaterial({ color: 'white' });
        const square = new THREE.Mesh(geometry, material);
        square.position.x = 0;
        square.position.y = 2;
        square.position.z = -5; // Dont block or be behind camera!
        square.renderOrder = 9999;
        this.camera.add(square)
    }

    

}

// Cube rendered to camera to render as 2D
// const geometry2d = new THREE.BoxGeometry(1, 1, 1);
// const material2d = new THREE.MeshBasicMaterial({ color: 'white' });
// const cube2d = new THREE.Mesh(geometry2d, material2d);
// camera.add(cube2d);