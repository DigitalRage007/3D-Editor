import { createHierarchyPanel } from './panels/hierarchy.js';
import { createInspectorPanel } from './panels/inspector.js';
import { createAssetsPanel } from './panels/assets.js';

export function createUI(root, options) {
    const { scene, onSelect, onSelectFace, onSetPickMode, onAddCube, onAddFace, onExtrudeFace, onAddVertex, onAddBone, onPlayAnimation, onImportMesh, onImportTexture, onDelete, onResetCamera, onExport } = options;
    root.style.pointerEvents = 'none';
    root.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
        #ui-root { color: #e8edf5; font: 13px/1.4 system-ui, sans-serif; }
        .editor-shell { display: flex; flex-direction: column; gap: 8px; padding: 12px; width: min(100% - 24px, 920px); box-sizing: border-box; pointer-events: none; transform-origin: top left; }
        .editor-toolbar { background: rgba(16, 22, 32, 0.92); border: 1px solid rgba(164, 183, 211, 0.2); box-shadow: 0 10px 30px rgba(0,0,0,.25); pointer-events: auto; }
        .editor-toolbar { display: flex; align-items: center; gap: 6px; padding: 7px; }
        .editor-title { margin: 0 12px 0 4px; font-size: 14px; letter-spacing: .04em; text-transform: uppercase; color: #9ed8ff; }
        .editor-button { border: 1px solid #3b526d; background: #1b2a3b; color: #e8edf5; padding: 6px 10px; cursor: pointer; border-radius: 3px; }
        .editor-button:hover { background: #29425c; }
        .editor-panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .editor-panel { min-width: 0; padding: 10px; max-height: calc(100vh - 105px); overflow: auto; scrollbar-width: thin; scrollbar-color: #526c88 #101722; pointer-events: none; background: rgba(16, 22, 32, 0.92); border: 1px solid rgba(164, 183, 211, 0.2); box-shadow: 0 10px 30px rgba(0,0,0,.25); }
        .panel-title { margin: 0 0 8px; color: #9ed8ff; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
        .hierarchy-list { list-style: none; padding: 0; margin: 0; }
            if (!selectedMesh || !container.classList.contains('uv-mode')) return;
        .hierarchy-item:hover, .hierarchy-item.selected { background: #284a68; }
        .inspector-empty, .asset-info { color: #9aa9ba; }
        .field-group { margin: 0 0 10px; }
        .field-label { display: block; margin-bottom: 4px; color: #9aa9ba; font-size: 11px; text-transform: uppercase; }
        .vector-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .editor-input { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid #3b526d; background: #101722; color: #e8edf5; padding: 5px; pointer-events: auto; }
        .editor-panel button, .editor-panel label, .editor-panel input, .hierarchy-item { pointer-events: auto; }
        .editor-button.selected { background: #284a68; border-color: #9ed8ff; }
        .face-title { margin: 0 0 8px; color: #ffd071; font-weight: 700; }
        .face-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 12px; }
        .face-button { border: 1px solid #3b526d; background: #101722; color: #c8d4e2; padding: 5px 3px; cursor: pointer; font-size: 11px; }
        .face-button:hover, .face-button.selected { background: #6a4e1c; border-color: #ffd071; color: #fff; }
        .color-row { display: flex; align-items: center; gap: 8px; }
        .color-input { width: 42px; height: 28px; border: 0; padding: 0; background: none; }
        .check-row { display: flex; align-items: center; gap: 7px; color: #c8d4e2; text-transform: none; }
        .check-row input { width: auto; }
        .asset-section-title { margin-top: 18px; }
        .asset-list { display: grid; gap: 4px; margin-bottom: 8px; color: #c8d4e2; }
        .asset-item { padding: 5px 7px; background: #101722; border: 1px solid #26384d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .uv-workspace { display: none; width: 100%; height: min(68vh, 620px); min-height: 360px; box-sizing: border-box; padding: 10px; background: rgba(16, 22, 32, 0.96); border: 1px solid rgba(164, 183, 211, 0.2); pointer-events: auto; }
        .uv-workspace-title { margin: 0 0 8px; color: #9ed8ff; font-size: 11px; text-transform: uppercase; }
        .uv-image-row { display: flex; align-items: center; gap: 8px; max-width: 400px; margin-bottom: 8px; color: #9aa9ba; font-size: 11px; text-transform: uppercase; }
        .uv-image-row .editor-input { flex: 1; }
        .uv-canvas { display: block; width: 100%; height: calc(100% - 24px); touch-action: none; cursor: grab; }
        .uv-canvas:active { cursor: grabbing; }
        .editor-shell.uv-mode .uv-workspace { display: block; }
        .editor-shell.uv-mode .editor-panels { display: none; }
        @media (max-width: 700px) { .editor-panels { grid-template-columns: 1fr; } .editor-toolbar { flex-wrap: wrap; } .editor-title { width: 100%; } }
    `;
    root.appendChild(style);
    window.addEventListener('keydown', event => {
        if (event.key.toLowerCase() !== 'f' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        root.style.display = root.style.display === 'none' ? '' : 'none';
    });

    const container = document.createElement('div');
    container.className = 'editor-shell';
    root.appendChild(container);

    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';
    const title = document.createElement('h1');
    title.className = 'editor-title';
    title.textContent = 'Lightweight 3D';
    toolbar.appendChild(title);
    const button = (label, handler) => {
        const element = document.createElement('button');
        element.className = 'editor-button';
        element.type = 'button';
        element.textContent = label;
        element.addEventListener('click', handler);
        toolbar.appendChild(element);
    };
    button('+ Cube', onAddCube);
    button('+ Face', onAddFace);
    button('Extrude', onExtrudeFace);
    button('+ Vertex', onAddVertex);
    button('+ Bone', onAddBone);
    button('Play', onPlayAnimation);
    button('Delete', onDelete);
    button('Center View', onResetCamera);
    button('Export', onExport);
    button('HUD -', () => setHudScale(Math.max(0.7, Number(container.dataset.hudScale || 1) - 0.1)));
    button('HUD +', () => setHudScale(Math.min(1.4, Number(container.dataset.hudScale || 1) + 0.1)));
    const uvWorkspace = document.createElement('div');
    uvWorkspace.className = 'uv-workspace';
    const uvTitle = document.createElement('h2');
    uvTitle.className = 'uv-workspace-title';
    uvTitle.textContent = 'Mesh UV Layout';
    const uvImageRow = document.createElement('label');
    uvImageRow.className = 'uv-image-row';
    uvImageRow.appendChild(document.createTextNode('Image'));
    const uvImageSelect = document.createElement('select');
    uvImageSelect.className = 'editor-input';
    uvImageRow.appendChild(uvImageSelect);
    uvImageSelect.addEventListener('change', () => {
        if (!selectedMesh) return;
        const asset = options.textureLibrary.get(uvImageSelect.value);
        selectedMesh.textureAssetId = asset?.id || null;
        selectedMesh.material.texture = asset?.texture || null;
        selectedMesh.material.useTexture = !!asset;
        drawUvWorkspace();
    });
    const uvCanvas = document.createElement('canvas');
    uvCanvas.className = 'uv-canvas';
    uvCanvas.width = 1000;
    uvCanvas.height = 680;
    uvWorkspace.append(uvTitle, uvImageRow, uvCanvas);
    let selectedMesh = null;
    let uvDrag = null;
    const uvRegion = { x: 270, y: 80, width: 460, height: 460 };

    function drawUvWorkspace() {
        if (!selectedMesh || !container.classList.contains('uv-mode')) return;
        const context = uvCanvas.getContext('2d');
        context.clearRect(0, 0, uvCanvas.width, uvCanvas.height);
        context.fillStyle = '#111923';
        context.fillRect(0, 0, uvCanvas.width, uvCanvas.height);
        const selectedFace = selectedMesh.selectedFace;
        const faceTextureId = selectedMesh.faceTextureIds[selectedFace];
        const imageAsset = options.textureLibrary.get(faceTextureId || selectedMesh.textureAssetId);
        if (imageAsset?.previewImage?.complete && imageAsset.previewImage.naturalWidth) {
            context.drawImage(imageAsset.previewImage, uvRegion.x, uvRegion.y, uvRegion.width, uvRegion.height);
        } else {
            context.fillStyle = '#202b37';
            context.fillRect(uvRegion.x, uvRegion.y, uvRegion.width, uvRegion.height);
            context.strokeStyle = '#344657';
            for (let position = 0; position <= 1; position += 0.1) {
                const x = uvRegion.x + uvRegion.width * position;
                const y = uvRegion.y + uvRegion.height * position;
                context.beginPath();
                context.moveTo(x, uvRegion.y);
                context.lineTo(x, uvRegion.y + uvRegion.height);
                context.moveTo(uvRegion.x, y);
                context.lineTo(uvRegion.x + uvRegion.width, y);
                context.stroke();
            }
        }
        context.strokeStyle = '#c4d6e6';
        context.lineWidth = 1.5;
        selectedMesh.faceUvs.forEach((faceUvs, faceIndex) => {
            if (!faceUvs?.length) return;
            context.beginPath();
            faceUvs.forEach(([u, v], vertexIndex) => {
                const x = uvRegion.x + u * uvRegion.width;
                const y = uvRegion.y + (1 - v) * uvRegion.height;
                if (vertexIndex === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            });
            context.closePath();
            context.fillStyle = faceIndex === selectedMesh.selectedFace ? 'rgba(255, 194, 75, 0.25)' : 'rgba(128, 190, 224, 0.12)';
            context.fill();
            context.strokeStyle = faceIndex === selectedMesh.selectedFace ? '#ffc24b' : '#c4d6e6';
            context.stroke();
        });
    }

    function uvAtPointer(event) {
        const rect = uvCanvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * uvCanvas.width / rect.width;
        const y = (event.clientY - rect.top) * uvCanvas.height / rect.height;
        return [(x - uvRegion.x) / uvRegion.width, 1 - (y - uvRegion.y) / uvRegion.height];
    }

    function refreshUvTextures() {
        uvImageSelect.innerHTML = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'No image';
        uvImageSelect.appendChild(empty);
        options.textureLibrary.assets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.id;
            option.textContent = asset.name;
            uvImageSelect.appendChild(option);
        });
        uvImageSelect.value = selectedMesh?.textureAssetId || '';
    }

    uvCanvas.addEventListener('pointerdown', event => {
        if (!selectedMesh) return;
        const [u, v] = uvAtPointer(event);
        const faceIndex = selectedMesh.faceUvs.findIndex(faceUvs => pointInPolygon([u, v], faceUvs));
        if (faceIndex < 0) return;
        selectedMesh.selectedFace = faceIndex;
        onSelectFace(faceIndex);
        uvDrag = { faceIndex, x: event.clientX, y: event.clientY };
        uvCanvas.setPointerCapture(event.pointerId);
        drawUvWorkspace();
    });
    uvCanvas.addEventListener('pointermove', event => {
        if (!uvDrag || !selectedMesh) return;
        const rect = uvCanvas.getBoundingClientRect();
        selectedMesh.moveFaceUVs(uvDrag.faceIndex, (event.clientX - uvDrag.x) * uvCanvas.width / rect.width / uvRegion.width, -(event.clientY - uvDrag.y) * uvCanvas.height / rect.height / uvRegion.height);
        uvDrag.x = event.clientX;
        uvDrag.y = event.clientY;
        drawUvWorkspace();
    });
    uvCanvas.addEventListener('pointerup', event => {
        uvDrag = null;
        if (uvCanvas.hasPointerCapture(event.pointerId)) uvCanvas.releasePointerCapture(event.pointerId);
    });

    ['face', 'vertex', 'mesh', 'orbit'].forEach(mode => {
        const modeButton = document.createElement('button');
        modeButton.className = 'editor-button' + (mode === 'face' ? ' selected' : '');
        modeButton.type = 'button';
        modeButton.textContent = mode[0].toUpperCase() + mode.slice(1);
        modeButton.dataset.pickMode = mode;
        modeButton.addEventListener('click', () => {
            onSetPickMode(mode);
            container.classList.toggle('uv-mode', mode === 'mesh');
            if (mode === 'mesh') drawUvWorkspace();
            toolbar.querySelectorAll('[data-pick-mode]').forEach(button => button.classList.toggle('selected', button.dataset.pickMode === mode));
        });
        toolbar.appendChild(modeButton);
    });
    container.appendChild(toolbar);
    container.appendChild(uvWorkspace);

    const panels = document.createElement('div');
    panels.className = 'editor-panels';
    container.appendChild(panels);

    const hierarchy = createHierarchyPanel(scene, onSelect);
    const inspector = createInspectorPanel(options.gl, options.textureLibrary, onSelectFace);
    const assets = createAssetsPanel(options.textureLibrary, onImportMesh, onImportTexture);

    panels.appendChild(hierarchy.element);
    panels.appendChild(inspector.element);
    panels.appendChild(assets.element);

    return {
        setSelected: mesh => { selectedMesh = mesh; inspector.setMesh(mesh); refreshUvTextures(); drawUvWorkspace(); },
        setFace: faceIndex => inspector.setFace(faceIndex),
        refreshHierarchy: hierarchy.refresh,
        refreshTextures: () => { assets.refresh(); inspector.refresh(); refreshUvTextures(); },
        updateUvWorkspace: drawUvWorkspace,
        setPickMode: mode => {
            onSetPickMode(mode);
            container.classList.toggle('uv-mode', mode === 'mesh');
            if (mode === 'mesh') drawUvWorkspace();
        }
    };

    function setHudScale(scale) {
        container.dataset.hudScale = scale;
        container.style.transform = `scale(${scale})`;
    }
}

function pointInPolygon(point, polygon) {
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
        const [x, y] = polygon[current];
        const [previousX, previousY] = polygon[previous];
        const intersects = (y > point[1]) !== (previousY > point[1]) && point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x;
        if (intersects) inside = !inside;
    }
    return inside;
}
