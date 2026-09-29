import { loadShaderSource } from './loader.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');
        if (!this.gl) throw new Error('WebGL not supported');

        this.resize();
        this.gl.clearColor(0.1, 0.1, 0.15, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        window.addEventListener('resize', () => this.resize());

        this.program = null;
        this.boneBuffer = null;
        this.ready = this.initProgram();
    }

    async initProgram() {
        const gl = this.gl;
        const vertSrc = await loadShaderSource('./engine/shaders/flat.vert');
        const fragSrc = await loadShaderSource('./engine/shaders/flat.frag');

        const vs = this.createShader(gl.VERTEX_SHADER, vertSrc);
        const fs = this.createShader(gl.FRAGMENT_SHADER, fragSrc);

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(prog));
        }

        this.program = prog;
        gl.useProgram(this.program);
    }

    createShader(type, src) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render(scene, camera) {
        const gl = this.gl;
        if (!this.program) return;

        gl.clearColor(0.1, 0.1, 0.15, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.program);

        const uView = gl.getUniformLocation(this.program, 'uView');
        const uProj = gl.getUniformLocation(this.program, 'uProj');

        const view = camera.getViewMatrix();
        const proj = camera.getProjectionMatrix(this.canvas.width / this.canvas.height);

        gl.uniformMatrix4fv(uView, false, view);
        gl.uniformMatrix4fv(uProj, false, proj);

        const opaqueFaces = new Map();
        const transparentFaces = [];
        scene.meshes.forEach(mesh => {
            const model = mesh.getModelMatrix();
            mesh.faceRanges.forEach((_, faceIndex) => {
                const color = mesh.faceColors[faceIndex] || [1, 1, 1, 1];
                const texture = mesh.faceTextures[faceIndex] || (mesh.material.useTexture ? mesh.material.texture : null);
                if (texture || (color[3] ?? 1) < 1) {
                    const polygon = mesh.polygons[faceIndex];
                    const center = polygon.reduce((sum, vertex) => sum.map((value, axis) => value + vertex[axis] / polygon.length), [0, 0, 0]);
                    const worldCenter = transformPoint(model, center);
                    const distance = Math.hypot(...worldCenter.map((value, axis) => value - camera.position[axis]));
                    transparentFaces.push({ mesh, faceIndex, distance });
                } else {
                    if (!opaqueFaces.has(mesh)) opaqueFaces.set(mesh, []);
                    opaqueFaces.get(mesh).push(faceIndex);
                }
            });
        });

        gl.depthMask(true);
        for (const [mesh, faceIndices] of opaqueFaces) {
            mesh.draw(gl, this.program, faceIndices);
        }

        transparentFaces.sort((a, b) => b.distance - a.distance);
        gl.depthMask(false);
        for (const face of transparentFaces) {
            face.mesh.draw(gl, this.program, [face.faceIndex]);
        }
        gl.depthMask(true);
        this.drawSkeletons(scene);
    }

    drawSkeletons(scene) {
        const gl = this.gl;
        const lineData = [];
        scene.meshes.forEach(mesh => {
            if (!mesh.skeleton.bones.length) return;
            const model = mesh.getModelMatrix();
            const transforms = mesh.skeleton.getWorldTransforms();
            mesh.skeleton.bones.forEach((bone, index) => {
                const transform = transforms.get(bone);
                const localEnd = rotateVector(transform.rotation, [0, bone.length, 0]);
                const start = transformPoint(model, transform.position);
                const end = transformPoint(model, transform.position.map((value, axis) => value + localEnd[axis]));
                const color = mesh.selectedBone === index ? [0.25, 0.9, 1] : [1, 0.68, 0.22];
                lineData.push(...start, ...color, ...end, ...color);
            });
        });
        if (!lineData.length) return;

        const program = this.program;
        const position = gl.getAttribLocation(program, 'aPosition');
        const color = gl.getAttribLocation(program, 'aColor');
        const uv = gl.getAttribLocation(program, 'aUV');
        if (!this.boneBuffer) this.boneBuffer = gl.createBuffer();
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineData), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(color);
        gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 24, 12);
        gl.disableVertexAttribArray(uv);
        gl.vertexAttrib2f(uv, 0, 0);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, identityMatrix());
        gl.uniform4fv(gl.getUniformLocation(program, 'uColor'), new Float32Array([1, 1, 1, 1]));
        gl.uniform1i(gl.getUniformLocation(program, 'uUseTexture'), 0);
        gl.uniform1f(gl.getUniformLocation(program, 'uFaceSelected'), 0);
        gl.uniform4f(gl.getUniformLocation(program, 'uUVTransform'), 1, 1, 0, 0);
        gl.uniform1f(gl.getUniformLocation(program, 'uUVRotation'), 0);
        gl.uniform2f(gl.getUniformLocation(program, 'uUVCenter'), 0.5, 0.5);
        gl.drawArrays(gl.LINES, 0, lineData.length / 6);
        gl.depthMask(true);
        gl.enable(gl.DEPTH_TEST);
    }
}

function transformPoint(matrix, point) {
    const x = matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12];
    const y = matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13];
    const z = matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14];
    return [x, y, z];
}

function rotateVector(matrix, vector) {
    return matrix.map(row => row.reduce((sum, value, axis) => sum + value * vector[axis], 0));
}

function identityMatrix() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
