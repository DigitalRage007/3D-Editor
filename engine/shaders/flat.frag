precision mediump float;

varying vec3 vColor;
varying vec2 vUV;

uniform bool uUseTexture;
uniform sampler2D uTexture;
uniform vec4 uColor;
uniform float uFaceSelected;

void main() {
    vec3 color = vColor * uColor.rgb;
    float alpha = uColor.a;
    if (uUseTexture && vUV.x >= 0.0 && vUV.x <= 1.0 && vUV.y >= 0.0 && vUV.y <= 1.0) {
        vec4 texel = texture2D(uTexture, vUV);
        color *= texel.rgb;
        alpha *= texel.a;
    }
    color = mix(color, vec3(1.0, 0.72, 0.12), uFaceSelected * 0.35);
    gl_FragColor = vec4(color, alpha);
}
