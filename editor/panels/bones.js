export function createBonesPanel({ onAddBone, onRemoveBone, onKeyBone, onChange = () => {}, onHistory = () => {} }) {
    const panel = document.createElement('div');
    panel.className = 'editor-panel bone-panel';
    let mesh = null;
    let keyTime = 0;

    function addNumber(label, value, onInput, step = '0.05') {
        const group = document.createElement('label');
        group.className = 'field-group';
        const caption = document.createElement('span');
        caption.className = 'field-label';
        caption.textContent = label;
        const input = document.createElement('input');
        input.className = 'editor-input';
        input.type = 'number';
        input.step = step;
        input.value = value;
        input.addEventListener('change', () => { onHistory(); onInput(Number(input.value) || 0); });
        group.append(caption, input);
        panel.appendChild(group);
    }

    function render() {
        panel.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'panel-title';
        title.textContent = 'Rig and Skinning';
        panel.appendChild(title);
        if (!mesh) {
            const empty = document.createElement('div');
            empty.className = 'inspector-empty';
            empty.textContent = 'Select a mesh to edit its rig.';
            panel.appendChild(empty);
            return;
        }

        const boneList = document.createElement('div');
        boneList.className = 'bone-list';
        mesh.skeleton.bones.forEach((bone, index) => {
            const select = document.createElement('button');
            select.className = 'bone-item' + (mesh.selectedBone === index ? ' selected' : '');
            select.type = 'button';
            select.textContent = `${bone.parent ? '  ' : ''}${bone.name}`;
            select.addEventListener('click', () => {
                mesh.selectedBone = index;
                render();
            });
            boneList.appendChild(select);
        });
        panel.appendChild(boneList);

        const addRoot = document.createElement('button');
        addRoot.className = 'editor-button';
        addRoot.type = 'button';
        addRoot.textContent = 'Add root bone';
        addRoot.addEventListener('click', () => onAddBone(null));
        const addChild = document.createElement('button');
        addChild.className = 'editor-button';
        addChild.type = 'button';
        addChild.textContent = 'Add child bone';
        addChild.disabled = mesh.selectedBone == null;
        addChild.addEventListener('click', () => onAddBone(mesh.selectedBone));
        panel.append(addRoot, addChild);

        const bone = mesh.skeleton.bones[mesh.selectedBone];
        if (!bone) {
            const empty = document.createElement('div');
            empty.className = 'inspector-empty field-group';
            empty.textContent = 'Add or select a bone to edit its pose.';
            panel.appendChild(empty);
            return;
        }

        const name = document.createElement('input');
        name.className = 'editor-input field-group';
        name.value = bone.name;
        name.setAttribute('aria-label', 'Bone name');
        name.addEventListener('change', () => {
            onHistory();
            bone.name = name.value.trim() || bone.name;
            onChange();
            render();
        });
        panel.appendChild(name);
        const parentLabel = document.createElement('div');
        parentLabel.className = 'inspector-empty field-group';
        parentLabel.textContent = `Parent: ${bone.parent?.name || 'Root'}`;
        panel.appendChild(parentLabel);

        ['X', 'Y', 'Z'].forEach((axis, index) => {
            addNumber(`Joint position ${axis}`, bone.position[index], value => {
                bone.position[index] = value;
                bone.bindPosition[index] = value;
                onChange();
            });
        });

        ['X', 'Y', 'Z'].forEach((axis, index) => {
            const group = document.createElement('div');
            group.className = 'field-group bone-slider-group';
            const labelRow = document.createElement('div');
            labelRow.className = 'bone-slider-label';
            const label = document.createElement('span');
            label.className = 'field-label';
            label.textContent = `Joint rotation ${axis}`;
            const valueLabel = document.createElement('output');
            const degrees = Math.round(bone.rotation[index] * 180 / Math.PI);
            valueLabel.textContent = `${degrees} deg (${Math.round(Math.abs(degrees) / 180 * 100)}%)`;
            labelRow.append(label, valueLabel);
            const slider = document.createElement('input');
            slider.className = 'editor-input';
            slider.type = 'range';
            slider.min = '-180';
            slider.max = '180';
            slider.step = '1';
            slider.value = String(degrees);
            slider.addEventListener('input', () => {
                onHistory();
                const next = Number(slider.value);
                bone.rotation[index] = next * Math.PI / 180;
                valueLabel.textContent = `${next} deg (${Math.round(Math.abs(next) / 180 * 100)}%)`;
                onChange();
            });
            group.append(labelRow, slider);
            panel.appendChild(group);
        });

        const lengthGroup = document.createElement('div');
        lengthGroup.className = 'field-group bone-slider-group';
        const lengthLabel = document.createElement('div');
        lengthLabel.className = 'bone-slider-label';
        const lengthName = document.createElement('span');
        lengthName.className = 'field-label';
        lengthName.textContent = 'Bone length';
        const lengthValue = document.createElement('output');
        lengthLabel.append(lengthName, lengthValue);
        const length = document.createElement('input');
        length.className = 'editor-input';
        length.type = 'range';
        length.min = '0.05';
        length.max = '2';
        length.step = '0.01';
        length.value = String(bone.length);
        const updateLength = () => {
            lengthValue.textContent = `${Number(length.value).toFixed(2)} (${Math.round(Number(length.value) / 2 * 100)}%)`;
        };
        updateLength();
        length.addEventListener('input', () => {
            onHistory();
            bone.length = Number(length.value);
            updateLength();
            onChange();
        });
        lengthGroup.append(lengthLabel, length);
        panel.appendChild(lengthGroup);

        const deleteBone = document.createElement('button');
        deleteBone.className = 'editor-button';
        deleteBone.type = 'button';
        deleteBone.textContent = 'Delete bone and children';
        deleteBone.addEventListener('click', () => onRemoveBone(mesh.selectedBone));
        panel.appendChild(deleteBone);

        const keyGroup = document.createElement('div');
        keyGroup.className = 'field-group bone-slider-group';
        const keyLabel = document.createElement('div');
        keyLabel.className = 'bone-slider-label';
        const keyTitle = document.createElement('span');
        keyTitle.className = 'field-label';
        keyTitle.textContent = 'Key current rotation';
        const keyValue = document.createElement('output');
        keyLabel.append(keyTitle, keyValue);
        const keySlider = document.createElement('input');
        keySlider.className = 'editor-input';
        keySlider.type = 'range';
        keySlider.min = '0';
        keySlider.max = '1.99';
        keySlider.step = '0.01';
        keySlider.value = String(keyTime);
        const updateKeyValue = () => {
            keyTime = Number(keySlider.value);
            keyValue.textContent = `${keyTime.toFixed(2)} s (${Math.round(keyTime / 2 * 100)}%)`;
        };
        updateKeyValue();
        keySlider.addEventListener('input', updateKeyValue);
        const addKey = document.createElement('button');
        addKey.className = 'editor-button';
        addKey.type = 'button';
        addKey.textContent = 'Set rotation key';
        addKey.addEventListener('click', () => onKeyBone(mesh.selectedBone, keyTime));
        keyGroup.append(keyLabel, keySlider, addKey);
        panel.appendChild(keyGroup);

        const selectedVertex = mesh.selectedVertex;
        const weightGroup = document.createElement('div');
        weightGroup.className = 'bone-weight-group';
        const weightTitle = document.createElement('div');
        weightTitle.className = 'panel-title';
        weightTitle.textContent = 'Selected vertex weight';
        weightGroup.appendChild(weightTitle);
        const weightLabel = document.createElement('div');
        weightLabel.className = 'inspector-empty field-group';
        weightLabel.textContent = selectedVertex
            ? `Vertex ${selectedVertex.vertexIndex + 1} on face ${selectedVertex.faceIndex + 1}`
            : 'Select a vertex in Vertex mode first.';
        weightGroup.appendChild(weightLabel);
        const skin = selectedVertex && mesh.vertexWeights.get(mesh.polygons[selectedVertex.faceIndex]?.[selectedVertex.vertexIndex]);
        const weightSlider = document.createElement('input');
        weightSlider.className = 'editor-input';
        weightSlider.type = 'range';
        weightSlider.min = '0';
        weightSlider.max = '100';
        weightSlider.step = '1';
        weightSlider.value = String(Math.round((skin?.weights.get(bone) || 0) * 100));
        weightSlider.disabled = !selectedVertex;
        const weightValue = document.createElement('output');
        weightValue.textContent = `${weightSlider.value}%`;
        weightSlider.addEventListener('input', () => { weightValue.textContent = `${weightSlider.value}%`; });
        weightGroup.append(weightSlider, weightValue);
        const assign = document.createElement('button');
        assign.className = 'editor-button';
        assign.type = 'button';
        assign.textContent = 'Assign weight to this bone';
        assign.disabled = !selectedVertex;
        assign.addEventListener('click', () => {
            if (!selectedVertex) return;
            onHistory();
            mesh.setVertexBoneWeight(selectedVertex.faceIndex, selectedVertex.vertexIndex, bone, Number(weightSlider.value) / 100);
            onChange();
            render();
        });
        const assignFace = document.createElement('button');
        assignFace.className = 'editor-button';
        assignFace.type = 'button';
        assignFace.textContent = 'Weight selected face';
        assignFace.addEventListener('click', () => {
            onHistory();
            const faceIndex = mesh.selectedFace;
            mesh.polygons[faceIndex]?.forEach((_, vertexIndex) => {
                mesh.setVertexBoneWeight(faceIndex, vertexIndex, bone, Number(weightSlider.value) / 100);
            });
            onChange();
            render();
        });
        const autoWeight = document.createElement('button');
        autoWeight.className = 'editor-button';
        autoWeight.type = 'button';
        autoWeight.textContent = 'Auto-weight near this bone';
        autoWeight.addEventListener('click', () => {
            onHistory();
            mesh.autoWeightBone(bone, Math.max(0.05, bone.length));
            onChange();
            render();
        });
        const clear = document.createElement('button');
        clear.className = 'editor-button';
        clear.type = 'button';
        clear.textContent = 'Clear vertex weights';
        clear.disabled = !selectedVertex || !skin;
        clear.addEventListener('click', () => {
            onHistory();
            if (selectedVertex) mesh.clearVertexBoneWeights(selectedVertex.faceIndex, selectedVertex.vertexIndex);
            onChange();
            render();
        });
        weightGroup.append(assign, assignFace, autoWeight, clear);
        panel.appendChild(weightGroup);
    }

    return {
        element: panel,
        setMesh(nextMesh) {
            mesh = nextMesh;
            if (mesh && mesh.selectedBone == null && mesh.skeleton.bones.length) mesh.selectedBone = 0;
            render();
        },
        refresh: render
    };
}
