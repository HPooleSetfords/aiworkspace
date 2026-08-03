/* ============================================================
   ai-orb — vanilla port of /Users/harrypoole/Documents/ai-orb/orb.component.ts

   GENERATED. The shader, SHAPE constants and uniform list below are lifted
   verbatim from that component; only the wrapper around them is new. Two
   deliberate differences, both forced by this page rather than by taste:

   1. The fragment shader emits premultiplied alpha instead of compositing over
      a `background` colour. Same maths, but the orb is now transparent, so it
      sits on the chip tints and the card surface without being told about them.

   2. Orbs of one colourway share a single WebGL context. This page shows up to
      18 rings at once and browsers cap contexts at ~8-16 — so each colourway
      renders once per frame into an offscreen canvas and every <ai-orb> of that
      colour blits from it. The README recommends exactly this ("share one
      instance") and it is why they all run off one clock.

   Usage: <ai-orb variant="finance"></ai-orb>            (size comes from CSS)
          <ai-orb variant="finance" state="thinking">   (the component's
          thinking state — the ring closes to a disc and opens back out over
          `thinkCycle`, 6s. Renderers are keyed by colourway *and* state, so a
          thinking orb only claims a context while it is actually thinking.)
   ============================================================ */
(function () {
  "use strict";

  const VERTEX_SRC = `#version 300 es
// Fullscreen triangle strip generated from gl_VertexID — no buffers needed.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

  const FRAGMENT_SRC = `#version 300 es
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
  // PORT NOTE: upstream writes mix(uBg, shellCol, cover*mask) opaque. That is
  // exactly a source-over composite, so emitting it as premultiplied alpha is
  // mathematically identical over any backdrop — and lets one renderer serve
  // placements sitting on different surfaces. uBg is consequently unused.
  float a = cover * mask;
  outColor = vec4(clamp(shellCol, 0.0, 1.0) * a, a);
}`;

  const SHAPE = {
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
  talkRate: 5.5,
};

  const FLOAT_UNIFORMS = [
  'radius', 'spin', 'wobble', 'lobePow',
  'wallIn', 'wallSpan', 'wallNoise', 'rimDim', 'dimFrom',
  'ampBase', 'ampGamma', 'ampMax',
  'carve', 'carveW', 'carveAmt', 'carveNoise', 'carveArc', 'carveCut',
  'rampIn', 'rampOut', 'glowPow', 'glowAmt',
  'noiseScaleA', 'noiseScaleB', 'noiseScaleC', 'noiseSpeed',
  'flowScale', 'flowRadial', 'flowSpeed', 'warpAng', 'warpRad',
  'shear', 'shearFrom', 'shearRate', 'shellWarp',
  'bloom', 'inkScale', 'gain',
  'thinking', 'talking', 'stateTime', 'thinkCycle', 'thinkFill',
  'thinkRise', 'thinkFall',
  'talkDepth', 'talkRate',
  'grainPx', 'grainStretch', 'grainDrift', 'grainMul', 'grainAdd',
];
  const VEC3_UNIFORMS = ['colA', 'colB', 'colCore'];
  const WARP_ANG_AT_FLOW_1 = 1.3;
  const SHEAR_AT_FLOW_1 = 1.15;

  /* Light-mode look, as exported from the preview ("Copy values", light mode):
     gain 2.5, bloom 0. inkLevel is absent from that export, which means it is
     unchanged from the component default — so 1, not the stock light 0.75.
     The exported background (#f6fafd, this page's surface) is deliberately not
     used: the shader emits alpha instead, so each placement's own surface shows
     through the core. Same result on #f6fafd, and correct on the chip tints too. */
  const LIGHT = { gain: 2.5, bloom: 0, inkLevel: 1 };

  /* Colourways as tuned in the preview and exported from light mode — orb 1
     blue, 2 amber, 3 green, 4 violet, which map onto the assistants by hue.
     `offset` is that orb's timeOffset from the same export, so the four never
     run in lockstep and read as clones. */
  const VARIANTS = {
    halo:           { colA: '#2500f8', colB: '#2da9ef', colCore: '#00aef8', offset: 0 },
    communications: { colA: '#ff5703', colB: '#ffd503', colCore: '#ff9603', offset: 7.9 },
    finance:        { colA: '#90ba07', colB: '#07ba5b', colCore: '#37ba07', offset: 16.3 },
    operations:     { colA: '#8561e6', colB: '#e661c3', colCore: '#c761e6', offset: 27.1 },
  };

  /* Offscreen render size, grown on demand to the largest ring on the page (the
     header rings are 32-44px, the onboarding ones are much bigger). */
  let SRC_PX = 128;
  const SRC_MAX = 512;
  const MAX_DPR = 2;

  function needSource(px) {
    const want = Math.min(SRC_MAX, Math.ceil(px / 64) * 64);
    if (want <= SRC_PX) return;
    SRC_PX = want;
    Object.keys(renderers).forEach((k) => {
      renderers[k].canvas.width = renderers[k].canvas.height = SRC_PX;
    });
  }

  function toRgb(value, fallback) {
    if (Array.isArray(value)) return value;
    const hex = String(value).trim().replace('#', '');
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      return [parseInt(hex[0] + hex[0], 16) / 255, parseInt(hex[1] + hex[1], 16) / 255, parseInt(hex[2] + hex[2], 16) / 255];
    }
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255];
    }
    return fallback;
  }

  /* ---------------------------------------------------------
     One WebGL renderer per colourway.
     --------------------------------------------------------- */
  function Renderer(spec, state) {
    this.spec = spec;
    this.state = state || 'idle';
    this.stateStart = 0;
    this.wasActive = false;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SRC_PX;
    this.consumers = new Set();
    this.ok = false;

    const gl = this.canvas.getContext('webgl2', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, powerPreference: 'low-power',
    });
    if (!gl) return;
    this.gl = gl;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('[ai-orb] shader compile failed:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ai-orb] program link failed:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    this.program = program;

    this.loc = {};
    const name = (k) => 'u' + k[0].toUpperCase() + k.slice(1);
    ['res', 'time'].concat(VEC3_UNIFORMS, FLOAT_UNIFORMS).forEach((k) => {
      this.loc[k] = gl.getUniformLocation(program, name(k));
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.ok = true;
  }

  Renderer.prototype.draw = function (time, stateTime) {
    if (!this.ok) return;
    const gl = this.gl, L = this.loc;
    gl.useProgram(this.program);
    gl.viewport(0, 0, SRC_PX, SRC_PX);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(L.res, SRC_PX, SRC_PX);
    gl.uniform1f(L.time, time + this.spec.offset);

    const values = Object.assign({}, SHAPE, {
      radius: 0.5,                       // diameter 1 — the orb fills its box
      spin: 3.0, wobble: 1,
      warpAng: WARP_ANG_AT_FLOW_1, shear: SHEAR_AT_FLOW_1,
      gain: LIGHT.gain, bloom: LIGHT.bloom, inkScale: LIGHT.inkLevel,
      thinking: this.state === 'thinking' ? 1 : 0,
      talking: this.state === 'talking' ? 1 : 0,
      stateTime: stateTime || 0,
      thinkCycle: 6, thinkFill: 1, thinkRise: 1, thinkFall: 1, talkDepth: 0.55,
      grainAdd: 0.08, grainMul: 0.11,
    });
    FLOAT_UNIFORMS.forEach((k) => { if (L[k]) gl.uniform1f(L[k], values[k]); });

    const cols = {
      colA: toRgb(this.spec.colA, [0.25, 0.88, 1.0]),
      colB: toRgb(this.spec.colB, [1.0, 0.28, 0.92]),
      colCore: toRgb(this.spec.colCore, [0.13, 0.05, 0.95]),
    };
    VEC3_UNIFORMS.forEach((k) => { if (L[k]) gl.uniform3fv(L[k], cols[k]); });

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  /* ---------------------------------------------------------
     Shared clock. One RAF drives every renderer and every blit.
     --------------------------------------------------------- */
  const renderers = {};
  const live = new Set();
  let clock = 0, last = 0, frame = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function rendererFor(key) {
    if (!renderers[key]) {
      const bits = key.split('|');
      renderers[key] = new Renderer(VARIANTS[bits[0]] || VARIANTS.halo, bits[1]);
    }
    return renderers[key];
  }

  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    clock += dt;
    paint();
    frame = live.size ? requestAnimationFrame(tick) : 0;
  }

  function paint() {
    const active = {};
    live.forEach((el) => { if (el._visible) active[el._key()] = true; });
    Object.keys(active).forEach((key) => {
      const r = rendererFor(key);
      // A renderer coming back into use restarts its state clock, so `thinking`
      // always begins from the resting ring rather than mid-cycle.
      if (!r.wasActive) r.stateStart = clock;
      r.draw(clock, clock - r.stateStart);
    });
    Object.keys(renderers).forEach((k) => { renderers[k].wasActive = !!active[k]; });
    live.forEach((el) => { if (el._visible && active[el._key()]) el._blit(); });
  }

  function kick() {
    if (reduced.matches) { paint(); return; }        // one static frame
    if (!frame && live.size) { last = performance.now(); frame = requestAnimationFrame(tick); }
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches && frame) { cancelAnimationFrame(frame); frame = 0; }
    kick();
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { e.target._visible = e.isIntersecting; });
    kick();
  }, { threshold: 0 });

  /* ---------------------------------------------------------
     <ai-orb variant="..."> — a 2D canvas blitting its colourway.
     --------------------------------------------------------- */
  class AiOrb extends HTMLElement {
    connectedCallback() {
      if (!this._canvas) {
        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute('aria-hidden', 'true');
        this._ctx = this._canvas.getContext('2d');
        this.appendChild(this._canvas);
      }
      this._variant = this.getAttribute('variant') || 'halo';
      this._state = this.getAttribute('state') || 'idle';
      this._visible = true;
      live.add(this);
      io.observe(this);
      this._resize();
      if (!this._ro) { this._ro = new ResizeObserver(() => { this._resize(); this._blit(); }); }
      this._ro.observe(this);
      kick();
    }

    disconnectedCallback() {
      live.delete(this);
      io.unobserve(this);
      if (this._ro) this._ro.unobserve(this);
      if (!live.size && frame) { cancelAnimationFrame(frame); frame = 0; }
    }

    static get observedAttributes() { return ['variant', 'state']; }
    attributeChangedCallback(n, o, v) {
      if (o === v) return;
      if (n === 'variant') this._variant = v || 'halo';
      if (n === 'state') this._state = v || 'idle';
      kick();
    }

    _key() { return this._variant + '|' + this._state; }

    _resize() {
      const r = this.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (this._canvas.width !== w || this._canvas.height !== h) {
        this._canvas.width = w;
        this._canvas.height = h;
      }
      needSource(Math.max(w, h));
    }

    _blit() {
      const src = rendererFor(this._key());
      if (!src.ok || !this._ctx) return;
      const c = this._canvas;
      this._ctx.clearRect(0, 0, c.width, c.height);
      this._ctx.drawImage(src.canvas, 0, 0, c.width, c.height);
    }
  }

  if (!customElements.get('ai-orb')) customElements.define('ai-orb', AiOrb);
})();
