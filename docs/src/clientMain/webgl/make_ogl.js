import { Camera, Geometry, Mesh, Renderer, Transform } from "ogl";
import { OneShotAnimator } from "./one_shot.js";

/**
 * @typedef {Object} OneShotBinding
 * @property {string} key - KeyboardEvent.code (e.g., "KeyP", "Digit1", "Space")
 * @property {string} uniform - Name of the uniform to animate
 * @property {number|number[]} [lower=0] - Start value (scalar or vector)
 * @property {number|number[]} [upper=1] - Peak value (scalar or vector)
 * @property {number} [duration=2000] - Duration in milliseconds
 */

/**
 * @typedef {Object} OneShotConfig
 * @property {OneShotBinding[]} [bindings] - Optional key bindings
 * @property {(animator: import('./one_shot.js').OneShotAnimator) => void} [init] - Optional initializer to wire custom events
 */

/**
 * @typedef {Object} SetupReturn
 * @property {import('ogl').Program} program - OGL program to render with
 * @property {(t: number) => void} animate - Per-frame callback (t is rAF high-res timestamp)
 * @property {string} [resolutionUniform="r"] - Uniform name for resolution vec2
 * @property {OneShotConfig} [oneShot] - Optional one-shot animator configuration
 */

/**
 * Factory that builds a renderer runner around an OGL Program with an animation loop.
 *
 * The provided setup(gl) should create the Program and return callbacks and options.
 *
 * @param {(gl: WebGLRenderingContext | WebGL2RenderingContext) => SetupReturn} setup
 * @returns {(canvas: HTMLElement) => WebGLRenderingContext | WebGL2RenderingContext}
 */
const make_ogl = (setup) => {
  return (canvas) => {
    const renderer = new Renderer({ canvas });
    const gl = renderer.gl;

    const { program, animate, resolutionUniform = "r", oneShot } = setup(gl);

    // Default geometry: Triangle that covers viewport, with UVs that still span 0 > 1 across viewport
    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const camera = new Camera(gl);
    camera.position.set(0, 0, 1);

    const scene = new Transform();
    mesh.setParent(scene);

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      program.uniforms[resolutionUniform].value = [
        gl.canvas.width,
        gl.canvas.height,
      ];
    }
    // Clean up prior resize listener
    if (window.__oglResize) {
      window.removeEventListener("resize", window.__oglResize, false);
      window.__oglResize = null;
    }
    window.__oglResize = resize;
    window.addEventListener("resize", resize, false);
    resize();

    // Clean up prior run (frame loop + animator)
    cancelAnimationFrame(window.__ogl);
    if (window.__oglAnimator) {
      window.__oglAnimator.dispose?.();
      window.__oglAnimator = null;
    }

    // Create animator if requested
    /** @type {import('./one_shot.js').OneShotAnimator | null} */
    let animator = null;
    if (oneShot) {
      animator = new OneShotAnimator(program);

      // Predefined key bindings
      if (Array.isArray(oneShot.bindings)) {
        oneShot.bindings.forEach((binding) => {
          const { key } = binding || {};
          if (!key) return;

          // If advanced options present, pass object config through to animator
          const hasAdvanced =
            binding &&
            typeof binding === "object" &&
            ("mode" in binding || "delta" in binding || "ease" in binding);

          if (hasAdvanced) {
            const cfg = { ...binding };
            // Normalize `uniform` -> `uniformName`
            cfg.uniformName = cfg.uniformName ?? cfg.uniform;
            delete cfg.uniform;
            delete cfg.key;

            // Convenience: for additive mode, treat `lower` as delta if `delta` is missing
            if (cfg.mode === "additive" && cfg.delta == null && cfg.lower != null) {
              cfg.delta = cfg.lower;
            }

            animator.bindKey(key, cfg);
          } else {
            // Legacy shape
            const { uniform, lower = 0, upper = 1, duration = 2000 } = binding;
            animator.bindKey(key, uniform, lower, upper, duration);
          }
        });
      }

      // Custom events
      if (typeof oneShot.init === "function") {
        oneShot.init(animator);
      }

      window.__oglAnimator = animator;
    }

    requestAnimationFrame(update);
    /** @param {number} t */
    function update(t) {
      window.__ogl = requestAnimationFrame(update);
      animate(t);
      if (animator) animator.animate(t);
      renderer.render({ scene, camera });
    }

    return gl; // Return gl so it can be used if needed
  };
};

export default make_ogl;
