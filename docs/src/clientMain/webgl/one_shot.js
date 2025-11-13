 /**
 * One-shot uniform animator that attaches to an existing OGL Program.
 *
 * Features:
 * - Modes:
 *   - 'oneshot': rises to upper then returns to lower (sine-curve by default)
 *   - 'ramp': adds delta over duration and holds the new value (no return)
 *   - 'additive': adds a time-varying delta that accumulates and supports overlapping triggers
 * - Easing: 'linear' | 'sine' | 'quad'
 * - Key bindings with backward compatibility with the legacy (key, uniform, lower, upper, duration) signature.
 *
 * Usage:
 *   const animator = new OneShotAnimator(program);
 *   // Legacy oneshot:
 *   animator.bindKey("KeyP", "uPulse", 0, 1, 800);
 *   // New object form with mode/ease:
 *   animator.bindKey("Digit1", { uniformName: "uPulse", mode: "ramp", delta: 0.3, duration: 400, ease: "sine" });
 *   animator.bindKey("Digit2", { uniformName: "uPulse", mode: "additive", delta: 0.1, duration: 250, ease: "quad" });
 *
 *   // Manual trigger:
 *   animator.trigger("uPulse", { mode: "additive", delta: 0.2, duration: 600 });
 */

/**
 * @typedef {'oneshot'|'ramp'|'additive'} AnimationMode
 *
 * @typedef {Object} TriggerOptions
 * @property {AnimationMode} [mode='oneshot']
 * @property {number|number[]} [lower=0]   // used by 'oneshot'
 * @property {number|number[]} [upper=1]   // used by 'oneshot'
 * @property {number|number[]} [delta=0]   // used by 'ramp' and 'additive'
 * @property {number} [duration=2000]
 * @property {'linear'|'sine'|'quad'} [ease='sine']
 */

/** @type {Record<string, (t:number)=>number>} */
const Easings = {
  linear: (t) => t,
  sine: (t) => Math.sin((t * Math.PI) / 2), // 0->1 smooth rise
  quad: (t) => t * t,
};

export class OneShotAnimator {
  /**
   * @param {import('ogl').Program} program - An existing OGL Program instance
   */
  constructor(program) {
    if (!program || !program.uniforms) {
      throw new Error("OneShotAnimator requires a Program with uniforms");
    }
    this.program = program;
    this.uniforms = program.uniforms;

    /**
     * Map of uniformName to animation state:
     * {
     *   nonAdditive: Anim | null,  // 'oneshot' or 'ramp' (last one wins)
     *   additives: Anim[]          // multiple additive animations accumulate
     * }
     * @type {Map<string, { nonAdditive: any | null, additives: any[], persistentOffset?: any, lastAddTotal?: any }>}
     */
    this.animations = new Map();

    /**
     * keyCode -> Array of bindings.
     * Bindings can be legacy shape {uniformName, lower, upper, duration}
     * or full options including {uniformName, mode, delta, duration, ease}
     * @type {Map<string, any[]>}
     */
    this.keyBindings = new Map();

    this._onKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener("keydown", this._onKeyDown);
  }

  /**
   * Remove all listeners and clear internal state.
   */
  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    this.animations.clear();
    this.keyBindings.clear();
  }

  /**
   * Bind a keyboard key to trigger an animation for a uniform.
   *
   * Backward-compatible signatures:
   *   bindKey("KeyP", "uPulse", 0, 1, 2000)
   * New object signature:
   *   bindKey("KeyP", { uniformName: "uPulse", mode: "additive", delta: 0.2, duration: 400, ease: "quad" })
   *
   * @param {string} keyCode - KeyboardEvent.code (e.g., "KeyP", "Digit1", "Space")
   * @param {string|Object} uniformOrConfig - uniformName or config object with { uniformName, mode, ... }
   * @param {number|number[]} [lower=0]
   * @param {number|number[]} [upper=1]
   * @param {number} [duration=2000]
   */
  bindKey(keyCode, uniformOrConfig, lower = 0, upper = 1, duration = 2000) {
    if (!this.keyBindings.has(keyCode)) {
      this.keyBindings.set(keyCode, []);
    }
    // New object form
    if (typeof uniformOrConfig === "object" && uniformOrConfig !== null) {
      this.keyBindings.get(keyCode).push(uniformOrConfig);
      return;
    }
    // Legacy form
    const uniformName = String(uniformOrConfig);
    this.keyBindings.get(keyCode).push({
      uniformName,
      lower,
      upper,
      duration,
      mode: "oneshot",
      ease: "sine",
    });
  }

  /**
   * Unbind a keyboard key. If uniformName is provided, only removes that binding.
   * @param {string} keyCode
   * @param {string} [uniformName]
   */
  unbindKey(keyCode, uniformName) {
    if (!this.keyBindings.has(keyCode)) return;
    if (uniformName == null) {
      this.keyBindings.delete(keyCode);
      return;
    }
    const next = (this.keyBindings.get(keyCode) || []).filter(
      (b) => b.uniformName !== uniformName,
    );
    if (next.length) this.keyBindings.set(keyCode, next);
    else this.keyBindings.delete(keyCode);
  }

  /**
   * Internal key handler
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    const configs = this.keyBindings.get(event.code);
    if (!configs) return;

    configs.forEach((config) => {
      // Support either legacy shape or new object
      if (
        config &&
        typeof config === "object" &&
        ("mode" in config || "delta" in config)
      ) {
        const { uniformName, ...opts } = config;
        this.trigger(uniformName, opts);
      } else {
        this.triggerOneShot(
          config.uniformName,
          config.lower,
          config.upper,
          config.duration,
        );
      }
    });
  }

  /**
   * Generic trigger with modes.
   * @param {string} uniformName
   * @param {TriggerOptions} [opts]
   */
  trigger(uniformName, opts = {}) {
    const {
      mode = "oneshot",
      lower = 0,
      upper = 1,
      delta = 0,
      duration = 2000,
      ease = "sine",
    } = opts;

    const u = this.uniforms[uniformName];
    if (!u || typeof u !== "object" || !("value" in u)) {
      if (
        typeof process !== "undefined" &&
        process?.env?.NODE_ENV !== "production"
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `OneShotAnimator: uniform "${uniformName}" not found on program.`,
        );
      }
      return;
    }

    const template = u.value;
    const lowerResolved = this._resolveShape(lower, template);
    const upperResolved = this._resolveShape(upper, template);
    const deltaResolved = this._resolveShape(delta, template);

    const anim = {
      isAnimating: true,
      startTime: performance.now(),
      duration,
      mode,
      ease,
      // For oneshot
      lower: lowerResolved,
      upper: upperResolved,
      // For ramp/additive
      base: this._cloneValue(template),
      delta: deltaResolved,
      // For additive accumulation
      prevOffset: this._zerosLike(template),
    };

    const existing = this.animations.get(uniformName) || {
      nonAdditive: null,
      additives: [],
      persistentOffset: this._zerosLike(template),
      lastAddTotal: this._zerosLike(template),
    };

    if (mode === "additive") {
      existing.additives.push(anim);
    } else {
      // For 'oneshot' and 'ramp', last one wins
      existing.nonAdditive = anim;
    }

    this.animations.set(uniformName, existing);
  }

  /**
   * Backward-compatible oneshot helper (preserves existing calls).
   * @param {string} uniformName
   * @param {number|number[]} [lower=0]
   * @param {number|number[]} [upper=1]
   * @param {number} [duration=2000]
   */
  triggerOneShot(uniformName, lower = 0, upper = 1, duration = 2000) {
    this.trigger(uniformName, {
      mode: "oneshot",
      lower,
      upper,
      duration,
      ease: "sine",
    });
  }

  /**
   * Call this every frame with a timestamp (e.g., from requestAnimationFrame).
   * @param {number} timestamp - ms
   */
  animate(timestamp) {
    for (const [uniformName, state] of this.animations.entries()) {
      const u = this.uniforms[uniformName];
      if (!u) continue;

      // Derive a stable base = (previous value - last additive total), so additive doesn't drift
      const template = u.value;
      const zero = this._zerosLike(template);
      const lastAddTotal = state.lastAddTotal ?? zero;
      const baseWithoutAdd = this._sub(u.value, lastAddTotal);

      // 1) Compute baseline from non-additive animation (if any)
      let baseline = baseWithoutAdd;
      if (state.nonAdditive && state.nonAdditive.isAnimating) {
        const anim = state.nonAdditive;
        const progress = Math.min(
          (timestamp - anim.startTime) / anim.duration,
          1,
        );
        const easeFn = this._ease(anim.ease);

        if (anim.mode === "oneshot") {
          // One-shot: 0 -> 1 -> 0 using a sine curve
          const s = Math.sin(progress * Math.PI);
          baseline = this._mix(anim.lower, anim.upper, s);
          if (progress >= 1) {
            anim.isAnimating = false;
            // Snap back to exact lower
            baseline = anim.lower;
          }
        } else if (anim.mode === "ramp") {
          // Ramp: base -> base + delta, then hold final value
          const t = easeFn(progress);
          baseline = this._add(anim.base, this._scale(anim.delta, t));
          if (progress >= 1) {
            anim.isAnimating = false;
            baseline = this._add(anim.base, anim.delta);
          }
        }
      }

      // 2) Compute additive total as persistentOffset + sum(active offsets)
      if (state.persistentOffset == null) {
        state.persistentOffset = this._zerosLike(template);
      }
      let addTotal = state.persistentOffset;

      let stillActive = [];
      if (state.additives && state.additives.length) {
        for (let i = 0; i < state.additives.length; i++) {
          const anim = state.additives[i];
          if (!anim.isAnimating) continue;

          const progress = Math.min(
            (timestamp - anim.startTime) / anim.duration,
            1,
          );
          const easeFn = this._ease(anim.ease);
          const t = easeFn(progress);

          const offsetNow = this._scale(anim.delta, t);
          addTotal = this._add(addTotal, offsetNow);

          if (progress < 1) {
            stillActive.push(anim);
          } else {
            anim.isAnimating = false;
            // Persist full delta into the baseline for future frames
            state.persistentOffset = this._add(
              state.persistentOffset,
              anim.delta,
            );
          }
        }
      }
      state.additives = stillActive;

      // 3) Set final value = baseline + additive total
      const finalValue = this._add(baseline, addTotal);
      this._setUniformValue(u, finalValue);

      // Track additive total to recover baseline next frame
      state.lastAddTotal = addTotal;

      // 4) Cleanup finished non-additive
      if (state.nonAdditive && !state.nonAdditive.isAnimating) {
        state.nonAdditive = null;
      }

      // 5) Remove state if there are no active animations
      if (
        !state.nonAdditive &&
        (!state.additives || state.additives.length === 0)
      ) {
        this.animations.delete(uniformName);
      } else {
        this.animations.set(uniformName, state);
      }
    }
  }

  // ===== Helpers =====

  /**
   * Get easing function by name.
   * @param {'linear'|'sine'|'quad'} name
   */
  _ease(name) {
    return Easings[name] || Easings.sine;
  }

  /**
   * If the template is a scalar, return a scalar number.
   * If the template is array-like, return an array matching its length.
   * If input is scalar but template is array, fill all components with the scalar.
   * @param {number|number[]} input
   * @param {any} template
   * @returns {number|number[]}
   */
  _resolveShape(input, template) {
    const isTemplateArray =
      Array.isArray(template) ||
      (ArrayBuffer.isView(template) && !(template instanceof DataView));

    if (!isTemplateArray) {
      // Template is scalar
      if (Array.isArray(input)) {
        // Take first, or 0 if empty
        return input[0] ?? 0;
      }
      return typeof input === "number" ? input : 0;
    }

    // Template is array-like
    const len = Number(template?.length) || 1;
    if (Array.isArray(input)) {
      // Fit or pad to length
      const out = new Array(len);
      for (let i = 0; i < len; i++) {
        out[i] = Number(input[i] ?? input[input.length - 1] ?? 0);
      }
      return out;
    }
    // Scalar input -> replicate across components
    const val = Number(input) || 0;
    return new Array(len).fill(val);
  }

  /**
   * Linear interpolation between a and b by t, supporting scalar or array values.
   * @param {number|number[]} a
   * @param {number|number[]} b
   * @param {number} t
   * @returns {number|number[]}
   */
  _mix(a, b, t) {
    if (Array.isArray(a) && Array.isArray(b)) {
      const len = Math.min(a.length, b.length);
      const out = new Array(len);
      for (let i = 0; i < len; i++) out[i] = a[i] + (b[i] - a[i]) * t;
      return out;
    }
    // Treat non-array as scalar
    const as = Number(a) || 0;
    const bs = Number(b) || 0;
    return as + (bs - as) * t;
  }

  /**
   * Assign value to OGL uniform while preserving typed arrays when present.
   * @param {{ value: any }} uniform
   * @param {number|number[]} next
   */
  _setUniformValue(uniform, next) {
    const cur = uniform.value;

    const isCurArrayLike =
      Array.isArray(cur) ||
      (ArrayBuffer.isView(cur) && !(cur instanceof DataView));

    if (!isCurArrayLike) {
      // Scalar uniform (or unknown type) -> assign directly
      uniform.value = Array.isArray(next) ? Number(next[0] ?? 0) : Number(next);
      return;
    }

    const isTyped = ArrayBuffer.isView(cur) && !(cur instanceof DataView);

    if (Array.isArray(next)) {
      if (isTyped) {
        const len = Math.min(cur.length, next.length);
        for (let i = 0; i < len; i++) cur[i] = Number(next[i] ?? 0);
      } else {
        // Plain JS array: replace reference is acceptable for OGL
        uniform.value = next.slice();
      }
      return;
    }

    // next is scalar -> fill all components
    const v = Number(next) || 0;
    if (isTyped) {
      for (let i = 0; i < cur.length; i++) cur[i] = v;
    } else {
      uniform.value = new Array(cur.length).fill(v);
    }
  }

  _cloneValue(v) {
    const isArrayLike =
      Array.isArray(v) || (ArrayBuffer.isView(v) && !(v instanceof DataView));
    if (!isArrayLike) return Number(v) || 0;
    return ArrayBuffer.isView(v) ? new v.constructor(v) : v.slice();
  }

  _zerosLike(template) {
    const isArrayLike =
      Array.isArray(template) ||
      (ArrayBuffer.isView(template) && !(template instanceof DataView));
    if (!isArrayLike) return 0;
    const len = Number(template.length) || 1;
    return new Array(len).fill(0);
  }

  _add(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      const len = Math.min(a.length, b.length);
      const out = new Array(len);
      for (let i = 0; i < len; i++) {
        out[i] = (Number(a[i]) || 0) + (Number(b[i]) || 0);
      }
      return out;
    }
    return (Number(a) || 0) + (Number(b) || 0);
  }

  _sub(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      const len = Math.min(a.length, b.length);
      const out = new Array(len);
      for (let i = 0; i < len; i++) {
        out[i] = (Number(a[i]) || 0) - (Number(b[i]) || 0);
      }
      return out;
    }
    return (Number(a) || 0) - (Number(b) || 0);
  }

  _scale(v, s) {
    if (Array.isArray(v)) {
      const out = new Array(v.length);
      for (let i = 0; i < v.length; i++) out[i] = (Number(v[i]) || 0) * s;
      return out;
    }
    return (Number(v) || 0) * s;
  }

  /**
   * Increment a uniform's current value by 'inc', supporting arrays and typed arrays.
   * @param {{ value: any }} uniform
   * @param {number|number[]} inc
   */
  _applyIncrement(uniform, inc) {
    const cur = uniform.value;
    const isArrayLike =
      Array.isArray(cur) ||
      (ArrayBuffer.isView(cur) && !(cur instanceof DataView));
    if (!isArrayLike) {
      uniform.value =
        (Number(cur) || 0) +
        (Array.isArray(inc) ? Number(inc[0] ?? 0) : Number(inc) || 0);
      return;
    }
    if (Array.isArray(cur)) {
      if (Array.isArray(inc)) {
        for (let i = 0; i < cur.length; i++) {
          cur[i] = (Number(cur[i]) || 0) + (Number(inc[i]) || 0);
        }
      } else {
        const s = Number(inc) || 0;
        for (let i = 0; i < cur.length; i++) cur[i] = (Number(cur[i]) || 0) + s;
      }
      return;
    }
    // typed array
    if (Array.isArray(inc)) {
      for (let i = 0; i < cur.length; i++) cur[i] += Number(inc[i]) || 0;
    } else {
      const s = Number(inc) || 0;
      for (let i = 0; i < cur.length; i++) cur[i] += s;
    }
  }
}
