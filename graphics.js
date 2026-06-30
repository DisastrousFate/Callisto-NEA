import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class TextLabel {
    constructor(text, parent, color = 'white', position = {x:0, y:0}, tagName = 'p', size = 1, font = 'Arial'){
        this.text = text;
        this.tagName = tagName;
        this.position = position;
        this.color = color;
        this.size = size;   
        this.font = font;
        this.parent = parent;

        this._createObject();

    }

    _createObject(){
        const text1_dom = document.createElement(this.tagName);
        text1_dom.innerText = this.text;
        text1_dom.style.color = this.color;
        text1_dom.style.fontSize = this.size;
        text1_dom.style.fontFamily = this.font;
        this.parent.appendChild(text1_dom);

        this.textObject = new CSS2DObject(text1_dom);
    }
}

export class HTML_TextLabel extends TextLabel {
    constructor(text, parent, color = 'white', position = {x:0, y:0}, tagName = 'p', size = 1, font = 'Arial'){
        super(text, parent, color, position, tagName, size, font);
    }

    _createObject(){
        const text1_dom = document.createElement(this.tagName);
        text1_dom.innerText = this.text;
        text1_dom.style.color = this.color;
        text1_dom.style.fontSize = this.size;
        text1_dom.style.fontFamily = this.font;
        this.parent.appendChild(text1_dom);

        
    }
}