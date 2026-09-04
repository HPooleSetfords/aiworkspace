// ============================================================
//  <ai-orb> — vanilla custom element wrapper around the AI Orb.
//
//  Ticket 33587. The shader, the SHAPE constants and the uniform
//  wiring below are lifted verbatim from the canonical component
//  at ~/Documents/ai-orb/orb.component.ts — this file only swaps
//  the Angular shell for a custom element so the prototype can
//  run without a build step. orb.component.ts stays canonical:
//  re-extract from it rather than tuning the shader here.
//
//  Attributes mirror the component's @Inputs, kebab-cased:
//    state="idle|thinking|talking"  speed  flow  spin  wobble
//    diameter  background  color-a  color-b  color-core
//    gain  bloom  ink-level  grain  grain-contrast
//    think-cycle  think-rise  think-fall  think-fill  talk-depth
//    time-offset  paused  max-pixel-ratio
//
//  On a light page use gain≈3.4, bloom=0, ink-level≈0.75 and set
//  `background` to the surface behind the orb (see the component's
//  README, "Working on light backgrounds").
// ============================================================
(function () {
  'use strict';

  var VERTEX_SRC = `#version 300 es
// Fullscreen triangle strip generated from gl_VertexID — no buffers needed.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

  var FRAGMENT_SRC = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2  uRes;
uniform float uTime;

uniform vec3  uBg, uColA, uColB, uColCore;
uniform float uRadius;
uniform float uSpin, uWobble, uLobePow;
uniform float uWallIn, uWallSpan, uWallNoise, uRimDim, uDimFrom;
uniform float uAmpBase, uAmpGamma, uAmpMax;
uniform float uCarve, uCarveW, uCarveAmt, uCarveNoise, uCarveArc, uCarveCut;
uniform float uRampIn, uRampOut;
uniform float uGlowPow, uGlowAmt;
uniform float uNoiseScaleA, uNoiseScaleB, uNoiseScaleC, uNoiseSpeed;
uniform float uFlowScale, uFlowRadial, uFlowSpeed, uWarpAng, uWarpRad;
uniform float uShear, uShearFrom, uShearRate, uShellWarp;
uniform float uBloom, uInkScale;
uniform float uThinking, uTalking, uStateTime;
uniform float uThinkCycle, uThinkFill, uThinkRise, uThinkFall;
uniform float uTalkDepth, uTalkRate;

uniform float uGain, uGrainPx, uGrainStretch, uGrainDrift, uGrainMul, uGrainAdd;

float hash1(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash1(i + vec3(0, 0, 0)), hash1(i + vec3(1, 0, 0)), u.x),
                 mix(hash1(i + vec3(0, 1, 0)), hash1(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash1(i + vec3(0, 0, 1)), hash1(i + vec3(1, 0, 1)), u.x),
                 mix(hash1(i + vec3(0, 1, 1)), hash1(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}

// Noise sampled on a circle, so it wraps exactly where the angle wraps and never
// shows a seam. Returns roughly -0.5 .. 0.5.
float ringNoise(float ang, float t, float k) {
  vec3 q = vec3(cos(ang) * k, sin(ang) * k, t);
  return vnoise(q) * 0.65 + vnoise(q * 2.07 + 11.0) * 0.35 - 0.5;
}

// As ringNoise, but the field also varies with radius. A warp built from this
// FOLDS the field rather than merely bending it as a whole.
float flowNoise(float ang, float rad, float t, float k, float kr) {
  vec3 q = vec3(cos(ang) * k, sin(ang) * k, rad * kr + t);
  return vnoise(q) * 0.65 + vnoise(q * 2.07 + 11.0) * 0.35 - 0.5;
}

float gauss(float x, float w) { float a = x / w; return exp(-a * a); }
// ---------------------------------------------------------------------------
// 'thinking' state: the resting ring thickens inward until it closes into a solid
// disc, then opens back out. Nothing about the silhouette or the shape changes --
// only where the shell's inner wall sits -- so it stays exactly the same circle.
// ---------------------------------------------------------------------------
// A trapezoid in real seconds, not fractions of the cycle: fill in over uThinkRise,
// HOLD filled for whatever is left, then open out over uThinkFall. min() of the two
// eased ramps rather than their product, so neither eats into the hold.
float thinkEnvelope(float t){
  float cyc  = max(0.2, uThinkCycle);
  float u    = mod(t, cyc);
  // Guarded and capped: a zero-length ramp makes smoothstep undefined, and together
  // they must not exceed the cycle.
  float rise = clamp(uThinkRise, 0.001, cyc * 0.5);
  float fall = clamp(uThinkFall, 0.001, cyc * 0.5);
  return min(smoothstep(0.0, rise, u), 1.0 - smoothstep(cyc - fall, cyc, u));
}

// 'talking' state: a speech-like amplitude envelope. Syllable-rate movement with
// faster detail on top, gated by a slower phrase rhythm so it breathes and pauses
// rather than buzzing continuously.
float talkEnvelope(float t){
  float ts  = t * uTalkRate;
  float syl = vnoise(vec3(ts,        0.0,  0.0));
  float det = vnoise(vec3(ts * 2.3,  7.0,  0.0));
  float phr = vnoise(vec3(ts * 0.27, 19.0, 0.0));
  float env = pow(clamp(syl*0.65 + det*0.35, 0.0, 1.0), 1.5);
  return env * smoothstep(0.30, 0.55, phr);
}


void main() {
  vec2  frag = gl_FragCoord.xy;
  float R = min(uRes.x, uRes.y) * uRadius;
  vec2  p = (frag - uRes * 0.5) / R;
  p.y = -p.y;
  float r = length(p);

  vec3  shellCol = vec3(0.0);
  float cover    = 0.0;

  if (r < 1.02) {
    float ang = atan(p.y, p.x);
    float t = uTime;

    // ---- FLOW -------------------------------------------------------------
    // 1. Differential rotation: the outer shell twists relative to the core, so
    //    features shear instead of turning rigidly. This is the main viscosity
    //    cue. It OSCILLATES rather than accumulating — a steady differential
    //    rate winds the field into an ever-tightening coil, which reads as a
    //    spring rather than a fluid. Two incommensurate rates stop the sloshing
    //    from looking like a loop.
    float tw = smoothstep(uShearFrom, 1.0, r)
             * (sin(t * uShearRate) + 0.6 * sin(t * uShearRate * 0.61 + 2.2));
    float as = ang + uShear * tw;

    // Everything angular degenerates at the exact centre, where atan is undefined and
    // a whole revolution fits inside one pixel. That never showed while the core was
    // always dark, but the winding loop passes through the middle, so the warp and the
    // grain have to be faded out there or they read as a sharp pinwheel spike.
    float centreFade = smoothstep(0.0, 0.18, r);

    // 2. Domain warp. Colour and geometry get DIFFERENT warps, and that split is
    //    the whole trick.
    //
    //    The hue field is displaced hard, and in 2D (the noise varies with radius
    //    as well as angle), so the colours genuinely fold and run.
    float w1 = flowNoise(as,       r, t * uFlowSpeed,             uFlowScale,       uFlowRadial);
    float w2 = flowNoise(as + 2.7, r, t * uFlowSpeed * 1.7 + 7.0, uFlowScale * 2.1, uFlowRadial * 1.7);
    float awColor = as + uWarpAng * centreFade * (w1 + 0.6 * w2);
    // How far into the 'thinking' fill we are: state influence times its envelope.
    float thinkAmt = uThinking * (uThinking > 0.0 ? thinkEnvelope(uStateTime) : 0.0);

    float rw = r + uWarpRad * (w2 - 0.5 * w1);

    //    The shell's own geometry is displaced only gently, and TANGENTIALLY ONLY.
    //    Warping the shell as hard as the colour tears it apart; and a radially
    //    varying warp here drags the narrow carve threshold across the shell,
    //    which shows up as hard-edged notches at the rim.
    float s1 = ringNoise(as + 8.0, t * uFlowSpeed * 0.9 + 31.0, uFlowScale);
    float awShell = as + uWarpAng * uShellWarp * 2.0 * centreFade * s1;

    // ---- SHELL ------------------------------------------------------------
    // Two opposed lights orbiting, with an organically varying rate.
    float phi = -uSpin * t
              + uWobble * (0.62 * sin(t * 0.31 + 0.7) + 0.38 * sin(t * 0.17 + 2.1));

    float nA = ringNoise(awShell,       t * uNoiseSpeed,              uNoiseScaleA);
    float mA = ringNoise(awShell + 1.1, t * uNoiseSpeed * 1.3 + 17.0, uNoiseScaleB);
    float nC = ringNoise(awShell + 3.3, t * uNoiseSpeed * 0.7 + 41.0, uNoiseScaleC);

    // Steep inner wall opening onto a plateau that stays bright all the way out,
    // dimming only slightly at the rim. The plateau is what makes the silhouette
    // read as a cleanly cut circle rather than a soft vignette.
    // 'thinking' pulls the inner wall toward the centre, so the ring thickens inward
    // until it closes into a solid disc. At thinkAmt 0 this is exactly the resting
    // wall, so the idle look is untouched.
    // Target -uWallSpan, not 0: the wall RAMPS from wallIn over uWallSpan, so
    // stopping at 0 leaves the ramp's own foot sitting on the centre and the disc
    // keeps a dark dot in the middle. Going negative completes the ramp before r=0.
    float wallIn = mix(uWallIn, -uWallSpan, thinkAmt * uThinkFill) + nA * uWallNoise;
    float wall   = smoothstep(wallIn, wallIn + uWallSpan, rw);
    float shellR = wall * (1.0 - uRimDim * smoothstep(uDimFrom, 1.0, rw));

    // Angular brightness: broad arcs, some falling close to dark.
    float amp = clamp(uAmpBase + mA * uAmpGamma, 0.0, uAmpMax);

    // A dark crescent carved inside the rim over a minority of the circumference.
    // This is what makes the shell read as a thin film over a hollow sphere
    // rather than a flat glowing ring.
    float arc = smoothstep(uCarveCut, uCarveCut + uCarveArc, nC + 0.5);
    float cut = 1.0 - uCarveAmt * arc * gauss(rw - (uCarve + nC * uCarveNoise), uCarveW);

    // Faint interior bleed so the core is a deep blue haze, not dead black. Gated
    // on the raw wall term so it cannot fill back in the rim dimming above.
    // max() guards the base: pow() with a negative base is UNDEFINED in GLSL. rw only
    // dips below zero via the radial warp, but the guard costs nothing.
    float glow = uGlowAmt * pow(max(rw, 0.0), uGlowPow) * (1.0 - wall);

    // 'talking': exposure rides a speech-like envelope.
    float exposure = uGain * mix(1.0,
        mix(1.0 - uTalkDepth, 1.0 + uTalkDepth*0.55, talkEnvelope(uStateTime)),
        uTalking);

    float shell = (shellR * amp * cut + glow) * exposure;


    // The two lights are wide enough to overlap, and their sum is additive — so
    // where they meet the result overshoots white. That, plus the spill below, is
    // where the blown-out highlights come from; there is no specular term.
    float lA = pow(max(0.0, 0.5 + 0.5 * cos(awColor - phi)),             uLobePow);
    float lB = pow(max(0.0, 0.5 + 0.5 * cos(awColor - phi + 3.1415927)), uLobePow);

    // The lasso's inner loop passes through the exact centre, where the lobe angle is
    // undefined and both lights sweep their whole range inside one pixel. Fading them
    // toward equal there resolves it to the neutral overlap instead of a pinwheel.
    lA = mix(0.5, lA, centreFade);
    lB = mix(0.5, lB, centreFade);

    // Iridescence: core colour blending out to the two rim colours. Note this is
    // the INK only -- intensity is deliberately NOT multiplied in here.
    float ramp = smoothstep(uRampIn, uRampOut, rw);
    vec3  ink  = mix(uColCore, uColA, ramp) * lA + mix(uColCore, uColB, ramp) * lB;

    // ---- COMPOSITE --------------------------------------------------------
    // Ink and intensity are kept separate, and intensity becomes COVERAGE. This
    // is what lets the orb work on a light page:
    //   * Adding the shell to the backdrop (the obvious approach) only works
    //     against black -- on a light backdrop every channel clips to 1.0 and the
    //     orb becomes a solid white disc with no hue left.
    //   * Normalising the ink to peak 1.0 is just as wrong: it forces every colour
    //     to full brightness, so a deep blue can only ever be a pale tint.
    // So divide only when the two lobes overlap past 1.0, and otherwise leave the
    // ink's own lightness completely alone.
    float peak = max(max(ink.r, ink.g), ink.b);
    cover = clamp(shell * peak, 0.0, 1.0);
    // uInkScale deepens the ink WITHOUT touching coverage. That is what lets ONE set
    // of colours serve both modes: the same hue has to be darker to contrast against
    // a light background, but the shell's shape and extent must not change with it.
    shellCol = ink / max(peak, 1.0) * uInkScale;

    // Overexposure desaturates toward white, as an over-driven camera would. Keep
    // this high on dark backgrounds for blown-out highlights; near 0 on light ones
    // so the hues stay saturated instead of washing out.
    // uBloom is a RATE, not a ceiling: how fast overexposure runs to white. Above
    // ~2 the hottest arcs go fully white well before the shell peaks, which is what
    // the additive original did by clipping each channel independently.
    shellCol = mix(shellCol, vec3(1.0),
                   clamp((shell * peak - 1.0) * max(0.0, uBloom), 0.0, 1.0));

    // ---- GRAIN ------------------------------------------------------------
    // Sampled in the WARPED frame, so it is carried along by the flow and shears
    // where the flow shears. Coherent noise, NOT a per-pixel hash: per-pixel
    // randomness re-rolled every frame is exactly what reads as television static.
    //
    // Anisotropic on purpose -- cells are stretched tangentially, so the texture
    // reads as fine streaks drawn out along the flow rather than isotropic specks.
    // Sampling via cos/sin keeps it seamless where the angle wraps.
    float kR = R / max(0.5, uGrainPx);
    float kA = kR / max(0.2, uGrainStretch);
    vec3  gq = vec3(cos(awColor)*kA, sin(awColor)*kA, rw*kR + t*uGrainDrift);
    float gn = vnoise(gq)*0.6 + vnoise(gq*2.13 + 5.0)*0.4;
    float g  = gn * 2.0 - 1.0;

    // Grain modulates COVERAGE, not the colour: that way it reads as texture on
    // the shell and leaves the backdrop clean, whatever the backdrop is.
    float gAmt = centreFade;
    cover = clamp(cover * (1.0 + g*uGrainMul*gAmt) + g*uGrainAdd*gAmt*sqrt(cover), 0.0, 1.0);
  }

  // Hard circular clip, ~1px antialiased. There is deliberately no outer glow.
  float aa   = 1.5 / (min(uRes.x, uRes.y) * uRadius);
  float mask = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);

  // Composite the shell over the background. One colour serves as both the page
  // backdrop and the orb's own body, which collapses
  //   mix(bg, mix(bg, shellCol, cover), mask)
  // to exactly this — the silhouette mask simply attenuates coverage at the edge.
  outColor = vec4(mix(clamp(uBg, 0.0, 1.0), shellCol, cover * mask), 1.0);
}`;

  // Shape / texture constants — the identity of the look, fitted as a set.
  var SHAPE = {
    lobePow: 1.0,
    wallIn: 0.6,
    wallSpan: 0.24,
    wallNoise: 0.04,
    rimDim: 0.4,
    dimFrom: 0.86,
    ampBase: 0.38,
    ampGamma: 1.45,
    ampMax: 1.5,
    carve: 0.82,
    carveW: 0.055,
    carveAmt: 0.9,
    carveNoise: 0.05,
    carveArc: 0.35,
    carveCut: 0.58,
    rampIn: 0.6,
    rampOut: 0.99,
    glowPow: 5.5,
    glowAmt: 0.55,
    noiseScaleA: 1.15,
    noiseScaleB: 1.15,
    noiseScaleC: 1.0,
    noiseSpeed: 0.75,
    flowScale: 1.8,
    flowRadial: 3.2,
    flowSpeed: 0.75,
    warpRad: 0.02,
    shearFrom: 0.35,
    shearRate: 0.5,
    shellWarp: 0.25,
    grainPx: 1.6,
    grainStretch: 3.0,
    grainDrift: 0.38,
    talkRate: 5.5
  };

  var WARP_ANG_AT_FLOW_1 = 1.3;
  var SHEAR_AT_FLOW_1 = 1.15;

  var FLOAT_UNIFORMS = [
    'radius', 'spin', 'wobble', 'lobePow', 'wallIn', 'wallSpan',
    'wallNoise', 'rimDim', 'dimFrom', 'ampBase', 'ampGamma', 'ampMax',
    'carve', 'carveW', 'carveAmt', 'carveNoise', 'carveArc', 'carveCut',
    'rampIn', 'rampOut', 'glowPow', 'glowAmt', 'noiseScaleA', 'noiseScaleB',
    'noiseScaleC', 'noiseSpeed', 'flowScale', 'flowRadial', 'flowSpeed', 'warpAng',
    'warpRad', 'shear', 'shearFrom', 'shearRate', 'shellWarp', 'bloom',
    'inkScale', 'gain', 'thinking', 'talking', 'stateTime', 'thinkCycle',
    'thinkFill', 'thinkRise', 'thinkFall', 'talkDepth', 'talkRate', 'grainPx',
    'grainStretch', 'grainDrift', 'grainMul', 'grainAdd'
  ];

  var VEC3_UNIFORMS = ['bg', 'colA', 'colB', 'colCore'];

  var DEFAULTS = {
    diameter: 0.6667,
    background: '#111113',
    colorA: '#00aef8',
    colorB: '#2da9ef',
    colorCore: '#2500f8',
    speed: 1,
    spin: 3.0,
    wobble: 1,
    flow: 1,
    gain: 2.65,
    bloom: 2.6,
    inkLevel: 1,
    grain: 0.08,
    grainContrast: 0.11,
    state: 'idle',
    thinkCycle: 6,
    thinkRise: 1,
    thinkFall: 1,
    thinkFill: 1,
    talkDepth: 0.55,
    timeOffset: 0,
    paused: false,
    maxPixelRatio: 2,
  };

  // camelCase input -> kebab-case attribute
  function attrName(key) {
    return key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
  }

  var NUMERIC = {};
  Object.keys(DEFAULTS).forEach(function (k) {
    NUMERIC[k] = typeof DEFAULTS[k] === 'number';
  });

  /** '#rrggbb' | '#rgb' | 'r,g,b' (0-255) -> normalised rgb triplet. */
  function toRgb(value, fallback) {
    if (Array.isArray(value)) return value;
    var s = String(value).trim();
    var hex = s.replace('#', '');
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return [
        parseInt(hex[0] + hex[0], 16) / 255,
        parseInt(hex[1] + hex[1], 16) / 255,
        parseInt(hex[2] + hex[2], 16) / 255,
      ];
    }
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
    var parts = s.split(',').map(Number);
    if (parts.length === 3 && parts.every(isFinite)) {
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    }
    return fallback;
  }

  var STATE_FADE = 0.35;   // seconds each half of the state cross-fade takes

  class AiOrb extends HTMLElement {
    static get observedAttributes() {
      return Object.keys(DEFAULTS).map(attrName);
    }

    constructor() {
      super();
      this.gl = null;
      this.program = null;
      this.locations = new Map();
      this.frameHandle = 0;
      this.clock = 0;
      this.activeState = 'idle';
      this.pendingState = null;
      this.stateBlend = 0;
      this.stateClock = 0;
      this.lastWallTime = 0;
      this.visible = true;
      this.reducedMotion = false;
      this.teardownTimer = 0;
      this.onMotionChange = this.onMotionChange.bind(this);
    }

    // Inputs are read fresh every frame, straight off the attributes.
    input(key) {
      var attr = this.getAttribute(attrName(key));
      if (attr === null) return DEFAULTS[key];
      if (NUMERIC[key]) {
        var n = parseFloat(attr);
        return isFinite(n) ? n : DEFAULTS[key];
      }
      if (key === 'paused') return attr !== 'false';
      return attr;
    }

    connectedCallback() {
      // A DOM move fires disconnect then connect; the deferred teardown lets the
      // element survive being re-parented without losing its GL context.
      if (this.teardownTimer) {
        clearTimeout(this.teardownTimer);
        this.teardownTimer = 0;
      }
      if (this.canvas) { this.resize(); this.sync(); return; }

      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.appendChild(this.canvas);

      var gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });

      if (!gl) {
        var rgb = toRgb(this.input('background'), [0.067, 0.067, 0.075]);
        this.style.background = 'rgb(' + rgb.map(function (c) {
          return Math.round(c * 255);
        }).join(',') + ')';
        if (!AiOrb.warned) {
          AiOrb.warned = true;
          console.warn('[ai-orb] WebGL2 is unavailable; falling back to a flat background.');
        }
        return;
      }
      this.gl = gl;
      if (!this.build(gl)) return;

      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener('change', this.onMotionChange);

      var self = this;
      this.resizeObserver = new ResizeObserver(function () { self.resize(); });
      this.resizeObserver.observe(this);

      this.intersectionObserver = new IntersectionObserver(function (entries) {
        self.visible = entries.some(function (e) { return e.isIntersecting; });
        self.sync();
      }, { threshold: 0 });
      this.intersectionObserver.observe(this);

      this.resize();
      this.sync();
    }

    disconnectedCallback() {
      this.stop();
      var self = this;
      this.teardownTimer = setTimeout(function () { self.destroy(); }, 0);
    }

    attributeChangedCallback(name) {
      if (!this.gl) return;
      if (name === attrName('maxPixelRatio')) this.resize();
      this.sync();
    }

    onMotionChange() {
      this.reducedMotion = !!(this.motionQuery && this.motionQuery.matches);
      this.sync();
    }

    destroy() {
      this.teardownTimer = 0;
      if (this.isConnected) return;
      this.stop();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
      if (this.motionQuery) this.motionQuery.removeEventListener('change', this.onMotionChange);
      var gl = this.gl;
      if (gl) {
        if (this.program) gl.deleteProgram(this.program);
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
      this.gl = null;
      this.program = null;
      this.locations.clear();
      if (this.canvas) { this.canvas.remove(); this.canvas = null; }
    }

    get running() { return this.frameHandle !== 0; }

    /** Start or stop the loop to match `paused`, visibility and reduced-motion. */
    sync() {
      var shouldRun = !!this.gl && !this.input('paused') && this.visible && !this.reducedMotion;
      if (shouldRun && !this.running) this.start();
      else if (!shouldRun && this.running) this.stop();
      if (!shouldRun && this.gl) this.draw(this.clock);
    }

    start() {
      var self = this;
      this.lastWallTime = performance.now();
      var tick = function () {
        var now = performance.now();
        // Clamp dt so returning from a background tab does not jump the clock.
        var dt = Math.min(0.1, (now - self.lastWallTime) / 1000);
        self.lastWallTime = now;
        var scaled = dt * Math.max(0, self.input('speed'));
        self.clock += scaled;
        self.advanceState(scaled);
        self.draw(self.clock);
        self.frameHandle = requestAnimationFrame(tick);
      };
      this.frameHandle = requestAnimationFrame(tick);
    }

    /**
     * Cross-fades between states: ease the outgoing one out, swap, ease the
     * incoming one in. Switching straight over would snap a half-wound shell
     * back to a circle.
     */
    advanceState(dt) {
      var wanted = this.input('state');
      if (wanted !== this.activeState && this.pendingState === null) {
        this.pendingState = wanted;
      }
      var step = dt / STATE_FADE;

      if (this.pendingState !== null) {
        this.stateBlend -= step;
        if (this.stateBlend <= 0) {
          this.stateBlend = 0;
          this.activeState = this.pendingState;
          this.pendingState = null;
          this.stateClock = 0;   // `thinking` always starts from the ring
        }
      } else if (this.activeState === 'idle') {
        this.stateBlend = 0;
      } else {
        this.stateBlend = Math.min(1, this.stateBlend + step);
      }
      this.stateClock += dt;
    }

    stop() {
      if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }

    build(gl) {
      var compile = function (type, src) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('[ai-orb] shader compile failed:', gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      var vs = compile(gl.VERTEX_SHADER, VERTEX_SRC);
      var fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
      if (!vs || !fs) return false;

      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('[ai-orb] program link failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return false;
      }

      gl.useProgram(program);
      this.program = program;

      var self = this;
      ['res', 'time'].concat(VEC3_UNIFORMS, FLOAT_UNIFORMS).forEach(function (k) {
        var n = 'u' + k[0].toUpperCase() + k.slice(1);
        self.locations.set(n, gl.getUniformLocation(program, n));
      });
      return true;
    }

    resize() {
      var gl = this.gl;
      if (!gl || !this.canvas) return;
      var rect = this.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, this.input('maxPixelRatio')));
      var w = Math.max(1, Math.round(rect.width * dpr));
      var h = Math.max(1, Math.round(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        // Resizing the backing store clears it, so repaint immediately if the
        // loop is not running (paused, offscreen, or reduced-motion).
        if (!this.running) this.draw(this.clock);
      }
    }

    draw(time) {
      var gl = this.gl;
      if (!gl || !this.program || !this.canvas) return;
      var self = this;
      var loc = function (k) {
        return self.locations.get('u' + k[0].toUpperCase() + k.slice(1)) || null;
      };

      gl.useProgram(this.program);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.uniform2f(loc('res'), this.canvas.width, this.canvas.height);
      gl.uniform1f(loc('time'), time + this.input('timeOffset'));

      var flow = Math.max(0, this.input('flow'));
      var values = Object.assign({}, SHAPE, {
        // `diameter` is a fraction of the host's smaller side; the shader wants
        // a radius as a fraction of that same side.
        radius: Math.max(0.01, Math.min(1, this.input('diameter'))) * 0.5,
        spin: this.input('spin'),
        wobble: this.input('wobble'),
        warpAng: WARP_ANG_AT_FLOW_1 * flow,
        shear: SHEAR_AT_FLOW_1 * flow,
        gain: this.input('gain'),
        bloom: this.input('bloom'),
        thinking: this.activeState === 'thinking' ? this.stateBlend : 0,
        talking: this.activeState === 'talking' ? this.stateBlend : 0,
        stateTime: this.stateClock,
        thinkCycle: Math.max(0.2, this.input('thinkCycle')),
        thinkFill: Math.max(0, this.input('thinkFill')),
        thinkRise: Math.max(0, this.input('thinkRise')),
        thinkFall: Math.max(0, this.input('thinkFall')),
        talkDepth: Math.max(0, this.input('talkDepth')),
        inkScale: Math.max(0, this.input('inkLevel')),
        grainAdd: this.input('grain'),
        grainMul: this.input('grainContrast'),
      });
      FLOAT_UNIFORMS.forEach(function (k) {
        var l = loc(k);
        if (l) gl.uniform1f(l, values[k]);
      });

      var colors = {
        bg: toRgb(this.input('background'), [0.067, 0.067, 0.075]),
        colA: toRgb(this.input('colorA'), [0, 0.682, 0.973]),
        colB: toRgb(this.input('colorB'), [0.176, 0.663, 0.937]),
        colCore: toRgb(this.input('colorCore'), [0.145, 0, 0.973]),
      };
      VEC3_UNIFORMS.forEach(function (k) {
        var l = loc(k);
        if (l) gl.uniform3fv(l, colors[k]);
      });

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  AiOrb.warned = false;

  if (!window.customElements.get('ai-orb')) {
    window.customElements.define('ai-orb', AiOrb);
  }
})();
