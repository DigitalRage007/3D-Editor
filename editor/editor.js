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
        if (Array.isArray(data.meshes)) {
            await this.importSceneData(data);
            return;
        }
        let vertices = data.vertices || [];
        if (vertices.length && typeof vertices[0] === 'number') {
            vertices = Array.from({ length: vertices.length / 3 }, (_, index) => vertices.slice(index * 3, index * 3 + 3));
        }
        let faces = data.faces || data.indices || [];
        if (faces.length && typeof faces[0] === 'number') {
            faces = faces.length % 3 === 0
                ? Array.from({ length: faces.length / 3 }, (_, index) => faces.slice(index * 3, index * 3 + 3))
                : [faces];
        }
        const mesh = Mesh.createFromData(new Material({ color: [0.78, 0.84, 0.92] }), { vertices, faces });
        mesh.name = file.name.replace(/\.[^.]+$/, '') || 'Imported Mesh';
        mesh.position = [0, 0.5, 0];
        this.scene.add(mesh);
        this.select(mesh);
    }

    async importSceneData(data) {
        const textureIds = new Map();
        for (const assetData of data.textureAssets || []) {
            const asset = await this.textureLibrary.importExportedAsset(assetData);
            textureIds.set(assetData.id, asset.id);
        }
        const resolveTexture = id => this.textureLibrary.get(textureIds.get(id) || id);
        const importedMeshes = [];
        for (const meshData of data.meshes) {
            const mesh = new Mesh(new Material({ color: [...(meshData.color || [0.78, 0.84, 0.92])] }));
            if (meshData.polygons) {
                mesh.polygons = meshData.polygons.map(polygon => polygon.map(vertex => [...vertex]));
            } else {
                let vertices = meshData.vertices || [];
                if (vertices.length && typeof vertices[0] === 'number') {
                    vertices = Array.from({ length: vertices.length / 3 }, (_, index) => vertices.slice(index * 3, index * 3 + 3));
                }
                let faces = meshData.faces || meshData.indices || [];
                if (faces.length && typeof faces[0] === 'number') {
                    faces = faces.length % 3 === 0
                        ? Array.from({ length: faces.length / 3 }, (_, index) => faces.slice(index * 3, index * 3 + 3))
                        : [faces];
                }
                mesh.polygons = faces.map(face => face.map(index => [...vertices[index]]));
            }
            mesh.name = meshData.name || 'Imported Mesh';
            mesh.position = [...(meshData.position || [0, 0, 0])];
            mesh.rotation = [...(meshData.rotation || [0, 0, 0])];
            mesh.scale = [...(meshData.scale || [1, 1, 1])];
            mesh.faceColors = (meshData.faceColors || []).map(color => [...color]);
            mesh.faceUvs = (meshData.faceUvs || []).map(faceUvs => faceUvs.map(uv => [...uv]));
            mesh.faceUvTransforms = (meshData.faceUvTransforms || []).map(transform => ({
                scale: [...(transform.scale || [1, 1])],
                offset: [...(transform.offset || [0, 0])],
                rotation: transform.rotation || 0,
                flipX: !!transform.flipX,
                flipY: !!transform.flipY
            }));
            mesh.rebuildRenderData();

            const boneMap = new Map();
            (meshData.bones || []).forEach(boneData => {
                const bone = mesh.skeleton.addBone(boneData.name || `Bone ${mesh.skeleton.bones.length + 1}`);
                bone.position = [...(boneData.position || [0, 0, 0])];
                bone.rotation = [...(boneData.rotation || [0, 0, 0])];
                bone.scale = [...(boneData.scale || [1, 1, 1])];
                bone.length = boneData.length || 0.5;
                bone.bindPosition = [...(boneData.bindPosition || bone.position)];
                bone.bindRotation = [...(boneData.bindRotation || bone.rotation)];
                boneMap.set(bone.name, bone);
            });
            (meshData.bones || []).forEach(boneData => {
                const bone = boneMap.get(boneData.name);
                const parent = boneMap.get(boneData.parent);
                if (bone && parent) {
                    bone.parent = parent;
                    parent.children.push(bone);
                }
            });
            mesh.selectedBone = mesh.skeleton.bones.length ? 0 : null;

            meshData.vertexWeights?.forEach((polygonWeights, faceIndex) => polygonWeights.forEach((entry, vertexIndex) => {
                const vertex = mesh.polygons[faceIndex]?.[vertexIndex];
                if (!vertex || !entry.weights?.length) return;
                const weights = new Map();
                entry.weights.forEach(weight => {
                    const bone = boneMap.get(weight.bone);
                    if (bone) weights.set(bone, weight.weight);
                });
                if (weights.size) mesh.vertexWeights.set(vertex, {
                    bindPosition: [...(entry.bindPosition || vertex)],
                    weights
                });
            }));

            mesh.textureAssetId = textureIds.get(meshData.textureAssetId) || meshData.textureAssetId || null;
            const meshTexture = resolveTexture(meshData.textureAssetId);
            mesh.material.texture = meshTexture?.texture || null;
            mesh.material.useTexture = !!mesh.material.texture;
            mesh.faceTextureIds = (meshData.faceTextureIds || []).map(id => textureIds.get(id) || id || null);
            mesh.faceTextures = mesh.faceTextureIds.map(id => resolveTexture(id)?.texture || null);

            if (meshData.animation) {
                const clip = new AnimationClip(meshData.animation.name || 'Imported Animation', meshData.animation.duration || 1);
                (meshData.animation.tracks || []).forEach(track => {
                    if (track.boneName) track.times.forEach((time, index) => clip.addBoneKeyframe(track.boneName, track.property, time, track.values[index]));
                    else clip.addTrack(track.property, [...track.times], track.values.map(value => [...value]));
                });
                mesh.animationClip = clip;
            }
            this.scene.add(mesh);
            importedMeshes.push(mesh);
        }
        this.ui.refreshTextures();
        if (importedMeshes.length) this.select(importedMeshes[importedMeshes.length - 1]);
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

    async exportScene() {
        const data = {
            format: 'lightweight-3d-scene',
            version: 1,
            coordinateSystem: { handedness: 'right', upAxis: 'Y', units: 'editor' },
            textureAssets: await this.textureLibrary.getExportData(),
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
