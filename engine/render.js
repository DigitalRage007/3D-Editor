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
    }
}

function transformPoint(matrix, point) {
    const x = matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12];
    const y = matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13];
    const z = matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14];
    return [x, y, z];
}
