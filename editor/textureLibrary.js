import { loadTextureBlob } from '../engine/loader.js';

export class TextureLibrary {
    constructor(gl) {
        this.gl = gl;
        this.assets = [];
        this.nextId = 1;
    }

    async addFile(file) {
        const texture = await loadTextureBlob(file, this.gl);
        return this.addTexture(file.name, texture);
    }

    addTexture(name, texture) {
        const asset = { id: `texture-${this.nextId++}`, name: name || 'Image', texture };
        this.assets.push(asset);
        return asset;
    }

    get(id) {
        return this.assets.find(asset => asset.id === id) || null;
    }
}
