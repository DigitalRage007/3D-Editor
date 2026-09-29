import { loadTextureBlob } from '../engine/loader.js';

export class TextureLibrary {
    constructor(gl) {
        this.gl = gl;
        this.assets = [];
        this.nextId = 1;
    }

    async addFile(file) {
        const texture = await loadTextureBlob(file, this.gl);
        const previewUrl = URL.createObjectURL(file);
        return this.addTexture(file.name, texture, previewUrl);
    }

    addTexture(name, texture, previewUrl = null) {
        const previewImage = previewUrl && typeof Image !== 'undefined' ? new Image() : null;
        if (previewImage) previewImage.src = previewUrl;
        const asset = { id: `texture-${this.nextId++}`, name: name || 'Image', texture, previewImage };
        this.assets.push(asset);
        return asset;
    }

    get(id) {
        return this.assets.find(asset => asset.id === id) || null;
    }
}
