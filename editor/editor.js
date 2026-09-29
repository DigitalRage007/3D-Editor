import { createUI } from './ui.js';
import { Gizmos } from './gizmos.js';
import { Mesh } from '../engine/mesh.js';
import { Material } from '../engine/material.js';
import { AnimationClip } from '../engine/animation.js';
import { TextureLibrary } from './textureLibrary.js';

export class Editor {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.textureLibrary = new TextureLibrary(renderer.gl);

        this.uiRoot = document.getElementById('ui-root');
        this.ui = createUI(this.uiRoot, {
            scene,
            gl: renderer.gl,
            textureLibrary: this.textureLibrary,
            onSelect: mesh => this.select(mesh),
            onSelectFace: faceIndex => this.selectFace(faceIndex),
            onSetPickMode: mode => this.gizmos.setPickMode(mode),
            onAddCube: () => this.addCube(),
            onAddPlane: () => this.addPrimitive('Plane'),
            onAddSphere: () => this.addPrimitive('Sphere'),
            onAddCylinder: () => this.addPrimitive('Cylinder'),
            onDuplicate: () => this.duplicateSelected(),
            onAddFace: () => this.addFace(),
            onExtrudeFace: () => this.extrudeFace(),
            onMergeFace: () => this.mergeSelectedFace(),
            onMergeVertices: () => this.mergeSelectedVertices(),
            onAddVertex: () => this.addVertex(),
            onAddBone: parentIndex => this.addBone(parentIndex),
            onRemoveBone: index => this.removeBone(index),
            onKeyBone: (index, time) => this.keyBonePose(index, time),
            onKeyBone: (index, time) => this.keyBonePose(index, time),
            onPlayAnimation: () => this.playAnimation(),
            onImportMesh: file => this.importMesh(file),
            onImportTexture: file => this.importTexture(file),
            onDelete: () => this.deleteSelected(),
            onResetCamera: () => this.resetCamera(),
            onExport: () => this.exportScene()
        });
        this.gizmos = new Gizmos(scene, camera, renderer.canvas, {
            onPickFace: (mesh, faceIndex) => {
                mesh.selectedVertex = null;
                this.select(mesh);
                this.selectFace(faceIndex);
            },
            onPickVertex: (mesh, faceIndex, vertexIndex) => {
                this.select(mesh);
                this.selectFace(faceIndex);
                mesh.selectedVertex = { faceIndex, vertexIndex };
                this.ui.setSelected(mesh);
            }
        });

        this.selected = null;
        this.select(scene.meshes[0] || null);
    }

    update() {
        this.gizmos.update();
        this.ui.updateUvWorkspace();
    }

    async importTexture(file) {
        await this.textureLibrary.addFile(file);
        this.ui.refreshTextures();
    }

    select(mesh) {
        this.selected = mesh;
        if (mesh) mesh.selectedFace = mesh.selectedFace < 0 ? 0 : mesh.selectedFace;
        this.ui.setSelected(mesh);
        this.ui.refreshHierarchy();
    }

    selectFace(faceIndex) {
        if (!this.selected) return;
        this.selected.selectedVertex = null;
        this.selected.selectedFace = faceIndex;
        this.ui.setFace(faceIndex);
    }

    addFace() {
        if (!this.selected) return;
        this.selected.addFace([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
        this.selectFace(this.selected.faceCount - 1);
    }

    extrudeFace() {
        if (!this.selected) return;
        this.selected.extrudeFace(Math.max(0, this.selected.selectedFace));
        this.selectFace(this.selected.selectedFace);
    }

    mergeSelectedFace() {
        if (!this.selected) return;
        if (this.selected.mergeCoplanarFace(Math.max(0, this.selected.selectedFace))) {
            this.selected.selectedVertex = null;
            this.selectFace(this.selected.selectedFace);
        }
    }

    mergeSelectedVertices() {
        const selectedVertex = this.selected?.selectedVertex;
        if (!selectedVertex) return;
        if (this.selected.mergeNearbyVertices(selectedVertex.faceIndex, selectedVertex.vertexIndex)) {
            this.selected.selectedVertex = null;
            this.ui.setSelected(this.selected);
        }
    }

    addVertex() {
        if (!this.selected) return;
        const faceIndex = Math.max(0, this.selected.selectedFace);
        this.selected.addVertex(faceIndex, [0, 0, 0]);
        this.ui.setSelected(this.selected);
    }

    addBone(parentIndex = null) {
        if (!this.selected) return;
        const parent = Number.isInteger(parentIndex) ? this.selected.skeleton.bones[parentIndex] : null;
        const bone = this.selected.skeleton.addBone(undefined, parent);
        this.selected.selectedBone = this.selected.skeleton.bones.indexOf(bone);
        this.ui.refreshBones();
    }

    removeBone(index) {
        if (!this.selected || !this.selected.removeBone(index)) return;
        this.ui.refreshBones();
    }

    keyBonePose(index, time) {
        const bone = this.selected?.skeleton.bones[index];
        if (!bone) return;
        if (!this.selected.animationClip) this.selected.animationClip = new AnimationClip('Rig Animation', 2);
        this.selected.animationClip.addBoneKeyframe(bone.name, 'rotation', time, bone.rotation);
    }

    playAnimation() {
        if (!this.selected) return;
        if (!this.selected.animationClip) {
            const clip = new AnimationClip('Transform Preview', 2);
            clip.addTrack('rotation', [0, 1, 2], [[0, 0, 0], [0, Math.PI, 0], [0, Math.PI * 2, 0]]);
            this.selected.animationClip = clip;
        }
        if (this.selected.animationPlayer.playing) this.selected.animationPlayer.stop();
        else this.selected.animationPlayer.play(this.selected.animationClip);
    }

    async importMesh(file) {
        const data = JSON.parse(await file.text());
        let vertices = data.vertices || [];
        if (vertices.length && typeof vertices[0] === 'number') {
            vertices = Array.from({ length: vertices.length / 3 }, (_, index) => vertices.slice(index * 3, index * 3 + 3));
        }
        let faces = data.faces || data.indices || [];
        if (faces.length && typeof faces[0] === 'number') faces = [faces];
        if (faces.length && faces[0].length === 3 && data.indices) faces = faces;
        const mesh = Mesh.createFromData(new Material({ color: [0.78, 0.84, 0.92] }), { vertices, faces });
        mesh.name = file.name.replace(/\.[^.]+$/, '') || 'Imported Mesh';
        mesh.position = [0, 0.5, 0];
        this.scene.add(mesh);
        this.select(mesh);
    }

    addCube() {
        this.addPrimitive('Cube');
    }

    addPrimitive(type) {
        const material = new Material({ color: [0.78, 0.84, 0.92] });
        const creators = {
            Cube: () => Mesh.createCube(material),
            Plane: () => Mesh.createPlane(material),
            Sphere: () => Mesh.createUvSphere(material),
            Cylinder: () => Mesh.createCylinder(material)
        };
        const mesh = creators[type]?.();
        if (!mesh) return;
        mesh.name = `${type} ${this.scene.meshes.length + 1}`;
        mesh.position = [0, 0.5, 0];
        this.scene.add(mesh);
        this.select(mesh);
    }

    duplicateSelected() {
        const source = this.selected;
        if (!source) return;
        const duplicate = new Mesh(new Material({
            color: [...source.material.color],
            useTexture: source.material.useTexture,
            texture: source.material.texture
        }));
        duplicate.name = `${source.name} Copy`;
        duplicate.position = source.position.map((value, axis) => value + (axis === 0 ? 1 : 0));
        duplicate.rotation = [...source.rotation];
        duplicate.scale = [...source.scale];
        duplicate.polygons = source.polygons.map(polygon => polygon.map(vertex => [...vertex]));
        duplicate.faceColors = source.faceColors.map(color => [...color]);
        duplicate.faceTextures = [...source.faceTextures];
        duplicate.faceTextureIds = [...source.faceTextureIds];
        duplicate.faceUvTransforms = source.faceUvTransforms.map(transform => ({
            scale: [...transform.scale],
            offset: [...transform.offset],
            rotation: transform.rotation,
            flipX: transform.flipX,
            flipY: transform.flipY
        }));
        duplicate.faceUvs = source.faceUvs.map(faceUvs => faceUvs.map(uv => [...uv]));
        duplicate.textureAssetId = source.textureAssetId;
        duplicate.rebuildRenderData();
        const bones = new Map();
        source.skeleton.bones.forEach(bone => {
            const parent = bones.get(bone.parent) || null;
            const cloned = duplicate.skeleton.addBone(bone.name, parent);
            cloned.position = [...bone.position];
            cloned.rotation = [...bone.rotation];
            cloned.scale = [...bone.scale];
            bones.set(bone, cloned);
        });
        source.polygons.forEach((polygon, faceIndex) => polygon.forEach((vertex, vertexIndex) => {
            const skin = source.vertexWeights.get(vertex);
            if (!skin) return;
            const duplicateVertex = duplicate.polygons[faceIndex]?.[vertexIndex];
            if (!duplicateVertex) return;
            duplicate.vertexWeights.set(duplicateVertex, {
                bindPosition: [...skin.bindPosition],
                weights: new Map([...skin.weights].map(([bone, weight]) => [bones.get(bone), weight]).filter(([bone]) => bone))
            });
        }));
        duplicate.animationClip = source.animationClip;
        this.scene.add(duplicate);
        this.select(duplicate);
    }

    deleteSelected() {
        if (!this.selected) return;
        this.scene.remove(this.selected);
        this.select(this.scene.meshes[this.scene.meshes.length - 1] || null);
    }

    resetCamera() {
        this.camera.position = [0, 1.5, 4];
        this.camera.target = [0, 0.5, 0];
        this.gizmos.syncFromCamera();
    }

    exportScene() {
        const data = {
            format: 'lightweight-3d-scene',
            version: 1,
            coordinateSystem: { handedness: 'right', upAxis: 'Y', units: 'editor' },
            meshes: this.scene.meshes.map(mesh => ({
                name: mesh.name,
                position: mesh.position,
                rotation: mesh.rotation,
                scale: mesh.scale,
                color: mesh.material.color,
                polygons: mesh.polygons,
                faceColors: mesh.faceColors,
                textureAssetId: mesh.textureAssetId,
                faceTextureIds: mesh.faceTextureIds,
                faceUvs: mesh.faceUvs,
                faceUvTransforms: mesh.faceUvTransforms,
                vertexWeights: mesh.getVertexWeightData(),
                animation: mesh.animationClip ? {
                    name: mesh.animationClip.name,
                    duration: mesh.animationClip.duration,
                    tracks: mesh.animationClip.tracks.map(track => ({
                        boneName: track.boneName || null,
                        property: track.property,
                        times: track.times,
                        values: track.values
                    }))
                } : null,
                bones: mesh.skeleton.bones.map(bone => ({
                    name: bone.name,
                    parent: bone.parent?.name || null,
                    position: bone.position,
                    rotation: bone.rotation,
                    scale: bone.scale,
                    length: bone.length,
                    bindPosition: bone.bindPosition,
                    bindRotation: bone.bindRotation
                }))
            }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'scene.json';
        link.click();
        URL.revokeObjectURL(link.href);
    }
}
