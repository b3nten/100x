import make_ogl from "./make_ogl.js";
import { Program } from "ogl";

export const fragments = make_ogl((gl) => {
  const vertex = /* glsl */ `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }`;

  const fragment = /* glsl */ `#version 300 es
  precision highp float;

  out vec4 outColor;

  uniform vec2 iResolution;
  uniform float iTime;

  /*
      "Fragments" by @XorDev
      https://x.com/XorDev/status/1963618494861258842

      Ported to WebGL2 (GLSL ES 3.00) with Shadertoy-style uniforms.
      Notes:
      - Avoids comma operator in for headers by restructuring loops.
      - Preserves original math and visual intent.
  */

  // 2-arg constructor tanh for vec4, robust for ES 3.00
  vec4 tanh4(vec4 x) {
    vec4 e2 = exp(2.0 * x);
    return (e2 - 1.0) / (e2 + 1.0);
  }

  void mainImage(out vec4 O, in vec2 I)
  {
    // Iterator (float for use in trig), raymarch depth, turbulence frequency proxy and time
    float z = 0.0;
    float t = iTime;

    // Raymarch sample point
    vec3 p;

    // Clear color
    O = vec4(0.0);

    // Raymarch 30 steps
    for (int step = 0; step < 30; ++step) {
      // Compute sample point and iterate through turbulence waves
      // https://mini.gmshaders.com/p/turbulence
      vec3 rd = normalize(vec3(I + I, 0.0) - iResolution.xyy); // like vec3(2*I - (res.x, res.y, res.y))
      p = z * rd;
      p.z -= t;

      // Blocky, stretched waves (use a separate freq var to avoid comma operator)
      for (float k = 1.0; k < 6.0; k += 1.0) {
        p += sin(round(p.yxz * 1.0) / 3.0 * k) / k;
      }

      // Distance field to cylinder + gyroid
      float df = 0.003 + abs(length(p.xy) - 8.0 + dot(cos(p), sin(p).yzx)) / 8.0;

      // Accumulate depth first (order matters vs original comma sequencing)
      z += df;

      // Color in waves and attenuate light
      float fi = float(step + 1); // matches original i++ in condition (i == 1..30 inside body)
      O += (1.0 + sin(fi * 0.3 + z + t + vec4(69.0, 1.0, 20.0, 0.0))) / df;
    }

    // Tanh tonemapping
    // https://mini.gmshaders.com/p/func-tanh
    O = tanh4(O / 1000.0);
  }

  void main() {
    mainImage(outColor, gl_FragCoord.xy);
  }`;

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iResolution: { value: [gl.canvas.width, gl.canvas.height] },
      iTime: { value: 0 },
    },
  });

  function animate(t) {
    program.uniforms.iTime.value = t * 0.001;
  }

  return { program, animate, resolutionUniform: "iResolution" };
});
