import { createHierarchyPanel } from './panels/hierarchy.js';
import { createInspectorPanel } from './panels/inspector.js';
import { createAssetsPanel } from './panels/assets.js';
import { createBonesPanel } from './panels/bones.js';

export function createUI(root, options) {
    const { scene, onSelect, onSelectFace, onSetPickMode, onAddCube, onAddPlane, onAddSphere, onAddCylinder, onAddBatch, onDuplicate, onAddFace, onExtrudeFace, onMergeFace, onMergeVertices, onAddVertex, onAddBone, onRemoveBone, onKeyBone, onPlayAnimation, onImportMesh, onImportTexture, onDelete, onResetCamera, onExport } = options;
    root.style.pointerEvents = 'none';
    root.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
        #ui-root { color: #e8edf5; font: 13px/1.4 system-ui, sans-serif; }
        .internal-fps { position: fixed; right: 12px; bottom: 12px; z-index: 20; padding: 6px 9px; color: #bfe9d3; background: rgba(13, 23, 20, 0.92); border: 1px solid rgba(115, 190, 150, 0.45); font: 12px/1.3 ui-monospace, monospace; font-variant-numeric: tabular-nums; pointer-events: none; }
        .polygon-counter { position: fixed; right: 12px; bottom: 44px; z-index: 20; max-width: calc(100vw - 24px); padding: 6px 9px; color: #d7e8fa; background: rgba(15, 23, 34, 0.94); border: 1px solid rgba(130, 165, 202, 0.4); font: 12px/1.3 ui-monospace, monospace; font-variant-numeric: tabular-nums; pointer-events: none; }
        .editor-shell { display: flex; flex-direction: column; gap: 8px; padding: 12px; width: min(100% - 24px, 920px); box-sizing: border-box; pointer-events: none; transform-origin: top left; }
        .editor-toolbar { background: rgba(16, 22, 32, 0.92); border: 1px solid rgba(164, 183, 211, 0.2); box-shadow: 0 10px 30px rgba(0,0,0,.25); pointer-events: auto; }
        .editor-toolbar { display: flex; flex-direction: column; gap: 5px; padding: 7px; }
        .editor-toolbar-head { display: flex; align-items: center; gap: 6px; }
        .tool-group { min-width: 0; }
        .tool-group summary { padding: 5px 8px; color: #9ed8ff; background: #101722; border: 1px solid #26384d; cursor: pointer; list-style: none; }
        .tool-group summary::-webkit-details-marker { display: none; }
        .tool-group summary::before { content: '+'; display: inline-block; width: 18px; color: #ffd071; }
        .tool-group[open] summary::before { content: '-'; }
        .tool-group-content { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px 0 2px; }
        .batch-create-controls { display: grid; grid-template-columns: minmax(100px, 1fr) 90px auto; gap: 5px; align-items: center; width: 100%; }
        .batch-create-status { grid-column: 1 / -1; min-height: 16px; color: #9aa9ba; font: 11px/1.3 ui-monospace, monospace; }
        .editor-title { margin: 0 12px 0 4px; font-size: 14px; letter-spacing: .04em; text-transform: uppercase; color: #9ed8ff; }
        .editor-button { border: 1px solid #3b526d; background: #1b2a3b; color: #e8edf5; padding: 6px 10px; cursor: pointer; border-radius: 3px; }
        .editor-button:hover { background: #29425c; }
        .editor-panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .editor-panel { min-width: 0; padding: 10px; max-height: calc(100vh - 105px); overflow: auto; scrollbar-width: thin; scrollbar-color: #526c88 #101722; pointer-events: none; background: rgba(16, 22, 32, 0.92); border: 1px solid rgba(164, 183, 211, 0.2); box-shadow: 0 10px 30px rgba(0,0,0,.25); }
        .panel-title { margin: 0 0 8px; color: #9ed8ff; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
        .hierarchy-list { list-style: none; padding: 0; margin: 0; }
        .hierarchy-item:hover, .hierarchy-item.selected { background: #284a68; }
        .inspector-empty, .asset-info { color: #9aa9ba; }
        .field-group { margin: 0 0 10px; }
        .field-label { display: block; margin-bottom: 4px; color: #9aa9ba; font-size: 11px; text-transform: uppercase; }
        .vector-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .editor-input { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid #3b526d; background: #101722; color: #e8edf5; padding: 5px; pointer-events: auto; }
        .editor-panel button, .editor-panel label, .editor-panel input, .hierarchy-item { pointer-events: auto; }
        .panel-disclosure { min-width: 0; }
        .panel-disclosure > summary { padding: 6px 8px; color: #9ed8ff; background: rgba(16, 22, 32, 0.92); border: 1px solid rgba(164, 183, 211, 0.2); cursor: pointer; pointer-events: auto; list-style: none; }
        .panel-disclosure > summary::-webkit-details-marker { display: none; }
        .panel-disclosure > summary::before { content: '+'; display: inline-block; width: 18px; color: #ffd071; }
        .panel-disclosure[open] > summary::before { content: '-'; }
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
        .bone-list { display: grid; gap: 4px; max-height: 150px; overflow: auto; margin-bottom: 8px; }
        .bone-item { padding: 5px 7px; color: #c8d4e2; background: #101722; border: 1px solid #26384d; text-align: left; cursor: pointer; }
        .bone-item.selected { color: #fff; border-color: #9ed8ff; background: #284a68; }
        .bone-slider-group { margin-top: 8px; }
        .bone-slider-label { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .bone-slider-label output, .bone-weight-group output { color: #ffd071; font-variant-numeric: tabular-nums; }
        .range-value { color: #ffd071; font-size: 11px; font-variant-numeric: tabular-nums; }
        .bone-weight-group { margin-top: 16px; padding-top: 12px; border-top: 1px solid #344657; }
        .bone-weight-group .editor-button { margin: 4px 4px 0 0; }
        .asset-item { padding: 5px 7px; background: #101722; border: 1px solid #26384d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .uv-workspace { display: none; flex-direction: column; width: 100%; height: min(68vh, 620px); min-height: 360px; box-sizing: border-box; padding: 10px; background: rgba(16, 22, 32, 0.96); border: 1px solid rgba(164, 183, 211, 0.2); pointer-events: auto; }
        .uv-workspace-title { margin: 0 0 8px; color: #9ed8ff; font-size: 11px; text-transform: uppercase; }
        .uv-image-row { display: flex; align-items: center; gap: 8px; max-width: 400px; margin-bottom: 8px; color: #9aa9ba; font-size: 11px; text-transform: uppercase; }
        .uv-image-row .editor-input { flex: 1; }
        .uv-transform-row { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; margin-bottom: 8px; }
        .uv-transform-row .field-group { width: 110px; margin: 0; }
        .uv-transform-row .editor-button { height: 30px; }
        .uv-canvas { display: block; flex: 1; width: 100%; height: auto; min-height: 0; touch-action: none; cursor: grab; }
        .uv-canvas:active { cursor: grabbing; }
        .editor-shell.uv-mode .uv-workspace { display: flex; }
        .editor-shell.uv-mode .editor-panels { display: none; }
        @media (max-width: 700px) { .editor-panels { grid-template-columns: 1fr; } .editor-toolbar { flex-wrap: wrap; } .editor-title { width: 100%; } }
    `;
    root.appendChild(style);
    const fpsReadout = document.createElement('div');
    fpsReadout.className = 'internal-fps';
    fpsReadout.textContent = 'Internal FPS --';
    root.appendChild(fpsReadout);
    const polygonReadout = document.createElement('div');
    polygonReadout.className = 'polygon-counter';
    polygonReadout.textContent = 'Current Mesh Polygons / All Polygons: 0 / 0';
    root.appendChild(polygonReadout);
    window.addEventListener('keydown', event => {
        if (event.key.toLowerCase() !== 'f' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        root.style.display = root.style.display === 'none' ? '' : 'none';
    });

    const container = document.createElement('div');
    container.className = 'editor-shell';
    root.appendChild(container);

    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';
    const toolbarHead = document.createElement('div');
    toolbarHead.className = 'editor-toolbar-head';
    const title = document.createElement('h1');
    title.className = 'editor-title';
    title.textContent = 'Lightweight 3D';
    toolbarHead.appendChild(title);
    toolbar.appendChild(toolbarHead);
    let activeToolGroup = toolbarHead;

    const group = (label, open = false) => {
        const details = document.createElement('details');
        details.className = 'tool-group';
        details.open = open;
        const summary = document.createElement('summary');
        summary.textContent = label;
        const content = document.createElement('div');
        content.className = 'tool-group-content';
        details.append(summary, content);
        toolbar.appendChild(details);
        activeToolGroup = content;
    };

    const button = (label, handler) => {
        const element = document.createElement('button');
        element.className = 'editor-button';
        element.type = 'button';
        element.textContent = label;
        element.addEventListener('click', handler);
        activeToolGroup.appendChild(element);
    };

    group('Modeling');
    button('+ Cube', onAddCube);
    button('+ Plane', onAddPlane);
    button('+ Sphere', onAddSphere);
    button('+ Cylinder', onAddCylinder);
    button('Duplicate', onDuplicate);
    const batchCreate = document.createElement('div');
    batchCreate.className = 'batch-create-controls';
    const batchType = document.createElement('select');
    batchType.className = 'editor-input';
    batchType.setAttribute('aria-label', 'Primitive type to add');
    ['Cube', 'Plane', 'Sphere', 'Cylinder'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        batchType.appendChild(option);
    });
    const batchAmount = document.createElement('input');
    batchAmount.className = 'editor-input';
    batchAmount.type = 'number';
    batchAmount.min = '1';
    batchAmount.max = '100000';
    batchAmount.step = '1';
    batchAmount.value = '100';
    batchAmount.setAttribute('aria-label', 'Number of meshes to add');
    const batchButton = document.createElement('button');
    batchButton.className = 'editor-button';
    batchButton.type = 'button';
    batchButton.textContent = 'Add copies';
    const batchStatus = document.createElement('output');
    batchStatus.className = 'batch-create-status';
    batchButton.addEventListener('click', async () => {
        const amount = Math.max(1, Math.min(100000, Math.floor(Number(batchAmount.value) || 1)));
        batchAmount.value = String(amount);
        batchButton.disabled = true;
        batchStatus.textContent = `Adding ${amount} ${batchType.value.toLowerCase()} meshes...`;
        try {
            await onAddBatch(batchType.value, amount, added => {
                batchStatus.textContent = `Added ${added} / ${amount}`;
            });
            batchStatus.textContent = `Added ${amount} ${batchType.value.toLowerCase()} meshes`;
        } catch (error) {
            batchStatus.textContent = `Batch stopped: ${error.message || error}`;
        } finally {
            batchButton.disabled = false;
        }
    });
    batchCreate.append(batchType, batchAmount, batchButton, batchStatus);
    activeToolGroup.appendChild(batchCreate);
    button('+ Face', onAddFace);
    button('Extrude', onExtrudeFace);
    button('+ Vertex', onAddVertex);
    button('+ Bone', () => onAddBone(null));
    button('Play', onPlayAnimation);
    button('Delete', onDelete);

    group('Selection Mode', true);
    const modeButtons = document.createElement('div');
    modeButtons.className = 'tool-group-content';
    const modeGroup = activeToolGroup;
    modeGroup.appendChild(modeButtons);

    group('View & Scene');
    button('Center View', onResetCamera);
    button('Export', onExport);
    button('HUD -', () => setHudScale(Math.max(0.7, Number(container.dataset.hudScale || 1) - 0.1)));
    button('HUD +', () => setHudScale(Math.min(1.4, Number(container.dataset.hudScale || 1) + 0.1)));
    const uvWorkspace = document.createElement('div');
    uvWorkspace.className = 'uv-workspace';
    const uvTitle = document.createElement('h2');
    uvTitle.className = 'uv-workspace-title';
    uvTitle.textContent = 'Mesh and UV Editing';
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
    const uvTransformRow = document.createElement('div');
    uvTransformRow.className = 'uv-transform-row';
    const uvRotationGroup = document.createElement('label');
    uvRotationGroup.className = 'field-group';
    const uvRotationLabel = document.createElement('span');
    uvRotationLabel.className = 'field-label';
    uvRotationLabel.textContent = 'Side rotation';
    const uvRotation = document.createElement('input');
    uvRotation.className = 'editor-input';
    uvRotation.type = 'range';
    uvRotation.min = '-180';
    uvRotation.max = '180';
    uvRotation.step = '1';
    uvRotation.value = '0';
    const uvRotationValue = document.createElement('output');
    uvRotationValue.className = 'range-value';
    uvRotationValue.textContent = '0 deg (0%)';
    const uvRotationLabelRow = document.createElement('div');
    uvRotationLabelRow.className = 'bone-slider-label';
    uvRotationLabelRow.append(uvRotationLabel, uvRotationValue);
    uvRotationGroup.append(uvRotationLabelRow, uvRotation);
    uvTransformRow.appendChild(uvRotationGroup);
    let previousUvRotation = 0;

    const makeUvDimensionControl = (label, axis) => {
        const group = document.createElement('label');
        group.className = 'field-group';
        const labelElement = document.createElement('span');
        labelElement.className = 'field-label';
        labelElement.textContent = label;
        const input = document.createElement('input');
        input.className = 'editor-input';
        input.type = 'number';
        input.min = '0.01';
        input.max = '4';
        input.step = '0.01';
        input.addEventListener('change', () => {
            if (!selectedMesh) return;
            const dimensions = selectedMesh.getFaceDimensions(selectedMesh.selectedFace);
            if (!dimensions) return;
            const oldSize = axis === 0 ? dimensions.width : dimensions.length;
            const nextSize = Math.max(0.01, Number(input.value) || oldSize);
            selectedMesh.scaleFaceGeometry(selectedMesh.selectedFace, axis === 0 ? nextSize / oldSize : 1, axis === 1 ? nextSize / oldSize : 1);
            drawUvWorkspace();
            refreshUvTransformControls(false);
        });
        group.append(labelElement, input);
        uvTransformRow.appendChild(group);
        return input;
    };
    const uvWidth = makeUvDimensionControl('Side width', 0);
    const uvLength = makeUvDimensionControl('Side length', 1);
    const uvActionButton = (label, rotation, scaleX, scaleY) => {
        const action = document.createElement('button');
        action.className = 'editor-button';
        action.type = 'button';
        action.textContent = label;
        action.addEventListener('click', () => {
            if (!selectedMesh) return;
            selectedMesh.rotateFaceGeometry(selectedMesh.selectedFace, rotation);
            selectedMesh.scaleFaceGeometry(selectedMesh.selectedFace, scaleX, scaleY);
            drawUvWorkspace();
            refreshUvTransformControls(false);
        });
        uvTransformRow.appendChild(action);
    };
    uvActionButton('Rotate -90', -Math.PI / 2, 1, 1);
    uvActionButton('Rotate +90', Math.PI / 2, 1, 1);
    uvActionButton('Widen', 0, 1.25, 1);
    uvActionButton('Lengthen', 0, 1, 1.25);
    const imageTransformRow = document.createElement('div');
    imageTransformRow.className = 'uv-transform-row';
    const imageRotationGroup = document.createElement('label');
    imageRotationGroup.className = 'field-group';
    const imageRotationLabel = document.createElement('span');
    imageRotationLabel.className = 'field-label';
    imageRotationLabel.textContent = 'Selected face image rotation';
    const imageRotation = document.createElement('input');
    imageRotation.className = 'editor-input';
    imageRotation.type = 'range';
    imageRotation.min = '-180';
    imageRotation.max = '180';
    imageRotation.step = '1';
    imageRotation.value = '0';
    const imageRotationValue = document.createElement('output');
    imageRotationValue.className = 'range-value';
    imageRotationValue.textContent = '0 deg (0%)';
    const imageRotationLabelRow = document.createElement('div');
    imageRotationLabelRow.className = 'bone-slider-label';
    imageRotationLabelRow.append(imageRotationLabel, imageRotationValue);
    imageRotationGroup.append(imageRotationLabelRow, imageRotation);
    imageTransformRow.appendChild(imageRotationGroup);
    let previousImageRotation = 0;
    const imageMirrorButton = (label, axis) => {
        const mirror = document.createElement('button');
        mirror.className = 'editor-button';
        mirror.type = 'button';
        mirror.textContent = label;
        mirror.addEventListener('click', () => {
            if (!selectedMesh) return;
            const transform = selectedMesh.faceUvTransforms[selectedMesh.selectedFace];
            const property = axis === 0 ? 'flipX' : 'flipY';
            transform[property] = !transform[property];
            mirror.classList.toggle('selected', transform[property]);
        });
        imageTransformRow.appendChild(mirror);
        return mirror;
    };
    const mirrorU = imageMirrorButton('Reflect U', 0);
    const mirrorV = imageMirrorButton('Reflect V', 1);
    const mergeFaceButton = document.createElement('button');
    mergeFaceButton.className = 'editor-button';
    mergeFaceButton.type = 'button';
    mergeFaceButton.textContent = 'Merge coplanar face';
    mergeFaceButton.addEventListener('click', () => {
        onMergeFace?.();
        refreshUvTransformControls();
        drawUvWorkspace();
    });
    imageTransformRow.appendChild(mergeFaceButton);
    const mergeVerticesButton = document.createElement('button');
    mergeVerticesButton.className = 'editor-button';
    mergeVerticesButton.type = 'button';
    mergeVerticesButton.textContent = 'Weld selected vertices';
    mergeVerticesButton.addEventListener('click', () => {
        onMergeVertices?.();
        drawUvWorkspace();
    });
    imageTransformRow.appendChild(mergeVerticesButton);
    imageRotation.addEventListener('input', () => {
        if (!selectedMesh) return;
        const nextRotation = Number(imageRotation.value);
        imageRotationValue.textContent = `${nextRotation} deg (${Math.round(Math.abs(nextRotation) / 180 * 100)}%)`;
        selectedMesh.faceUvTransforms[selectedMesh.selectedFace].rotation += (nextRotation - previousImageRotation) * Math.PI / 180;
        previousImageRotation = nextRotation;
    });

    function refreshFaceImageControls() {
        const transform = selectedMesh?.faceUvTransforms[selectedMesh.selectedFace];
        imageRotation.disabled = !transform;
        mirrorU.disabled = !transform;
        mirrorV.disabled = !transform;
        mergeFaceButton.disabled = !transform;
        mergeVerticesButton.disabled = !selectedMesh?.selectedVertex;
        previousImageRotation = 0;
        imageRotation.value = '0';
        imageRotationValue.textContent = '0 deg (0%)';
        mirrorU.classList.toggle('selected', !!transform?.flipX);
        mirrorV.classList.toggle('selected', !!transform?.flipY);
    }
    uvRotation.addEventListener('input', () => {
        if (!selectedMesh) return;
        const nextRotation = Number(uvRotation.value);
        uvRotationValue.textContent = `${nextRotation} deg (${Math.round(Math.abs(nextRotation) / 180 * 100)}%)`;
        selectedMesh.rotateFaceGeometry(selectedMesh.selectedFace, (nextRotation - previousUvRotation) * Math.PI / 180);
        previousUvRotation = nextRotation;
        drawUvWorkspace();
        refreshUvTransformControls(false);
        uvRotation.value = String(previousUvRotation);
    });

    function refreshUvTransformControls(resetRotation = true) {
        const dimensions = selectedMesh && selectedMesh.getFaceDimensions(selectedMesh.selectedFace);
        uvWidth.value = dimensions ? dimensions.width.toFixed(2) : '';
        uvLength.value = dimensions ? dimensions.length.toFixed(2) : '';
        uvWidth.disabled = !dimensions;
        uvLength.disabled = !dimensions;
        uvRotation.disabled = !dimensions;
        if (resetRotation) {
            previousUvRotation = 0;
            uvRotation.value = '0';
        }
    }

    const uvCanvas = document.createElement('canvas');
    uvCanvas.className = 'uv-canvas';
    uvCanvas.width = 1000;
    uvCanvas.height = 680;
    uvWorkspace.append(uvTitle, uvImageRow, uvTransformRow, imageTransformRow, uvCanvas);
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
        refreshUvTransformControls();
        refreshFaceImageControls();
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
        modeButtons.appendChild(modeButton);
    });
    container.appendChild(toolbar);
    container.appendChild(uvWorkspace);

    const panels = document.createElement('div');
    panels.className = 'editor-panels';
    container.appendChild(panels);

    const hierarchy = createHierarchyPanel(scene, onSelect);
    const inspector = createInspectorPanel(options.gl, options.textureLibrary, onSelectFace);
    const assets = createAssetsPanel(options.textureLibrary, onImportMesh, onImportTexture);
    const bones = createBonesPanel({ onAddBone, onRemoveBone, onKeyBone });

    const panelDisclosure = (label, element, open = false) => {
        const disclosure = document.createElement('details');
        disclosure.className = 'panel-disclosure';
        disclosure.open = open;
        const summary = document.createElement('summary');
        summary.textContent = label;
        disclosure.append(summary, element);
        return disclosure;
    };
    panels.appendChild(panelDisclosure('Hierarchy', hierarchy.element));
    panels.appendChild(panelDisclosure('Inspector', inspector.element, true));
    panels.appendChild(panelDisclosure('Assets', assets.element));
    panels.appendChild(panelDisclosure('Rig and Skinning', bones.element));

    return {
        setSelected: mesh => { selectedMesh = mesh; inspector.setMesh(mesh); bones.setMesh(mesh); refreshUvTextures(); refreshUvTransformControls(); refreshFaceImageControls(); drawUvWorkspace(); },
        setFace: faceIndex => { inspector.setFace(faceIndex); refreshUvTransformControls(); refreshFaceImageControls(); drawUvWorkspace(); },
        refreshHierarchy: hierarchy.refresh,
        refreshBones: bones.refresh,
        setInternalFps: (fps, frameMs) => { fpsReadout.textContent = `Internal FPS ${Math.round(fps)} | ${frameMs.toFixed(2)} ms`; },
        setPolygonCount: (current, total) => { polygonReadout.textContent = `Current Mesh Polygons / All Polygons: ${current} / ${total}`; },
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
