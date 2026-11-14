/**
 * Grand O de holosene.fr : un anneau qui passe de l'encre (direction artistique du S : trait noir, organique) à la roue
 * numérique irisée (direction artistique du « o », roue du logo-kit), et revient.
 *
 * Encre : un O calligraphique tracé au pinceau. Comme dans la typo du logotype, l'épaisseur du trait règle sa densité :
 * les pleins sont noirs et saturés, les déliés plus clairs et secs (fibres du pinceau qui se séparent). L'encre
 * s'épuise le long du tracé (le bout du trait est plus sec), s'accumule sur les bords (bord mouillé), le papier a un
 * grain, et le bord du trait est irrégulier. Le trait est d'un seul geste : il part du haut, tourne dans le sens
 * inverse des aiguilles d'une montre et recouvre son départ (le recouvrement est plus foncé, comme deux passages d'encre).
 * Numérique : l'anneau du kit (rayon intérieur 0,514 × extérieur), couleurs de la texture « flux » (flow.js, roue qui
 * respire sans jamais tourner).
 * Passage de l'un à l'autre : un front fait le tour de l'anneau ; derrière lui, l'anneau se régularise et l'encre se
 * convertit en cellules numériques (pixels qui s'allument dans le désordre près du front, avec un éclat).
 * Curseur : le trait se renfle sous le curseur (balle dans un collant, comme le S) ; sur la roue, la couleur survolée
 * s'élargit (FLOW.hover*, flow.js) et le fond s'en teinte (backdrop.js).
 */
import { FLOW } from '../flow.js'

const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;      // toile (px de l'écran)
uniform float uR;       // rayon extérieur de l'anneau numérique (px)
uniform float uTime;    // s
uniform float uDraw;    // avancée du geste (0 à 1, recouvrement compris)
uniform vec3 uSweep;    // passage : avancée du front (0 à 1), état avant (0 encre, 1 numérique), état après
uniform vec3 uInk;      // couleur de l'encre (thème)
uniform vec3 uPtr;      // curseur (px de la toile, origine en haut à gauche), présence (0 à 1)
uniform float uDpr;
uniform sampler2D uLut; // roue « flux » (flow.js) : u = position sur la roue, 0 en bas (cyan), sens horaire
out vec4 o;

const float PI = 3.14159265, TAU = 6.2831853;
const float RI = 0.514;          // rayon intérieur / extérieur (kit)
const float OV = 0.09;           // recouvrement du geste (part de tour)
const float AXIS = -0.62;        // axe des pleins (rad, y vers le bas : pleins en haut à droite et en bas à gauche)
const float T0 = -1.92;          // départ du geste (rad, y vers le bas : un peu à gauche du haut)

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

// géométrie du trait d'encre à l'angle th (rayon médian, demi-épaisseur), sans renflement
float midR(float th) { return uR * (1.0 + RI) * 0.5 * (1.0 + 0.014 * sin(2.0 * th + 0.7) + 0.02 * (fbm(vec2(th * 1.3, 3.1)) - 0.5)); }
float halfW(float th) {
  float c = abs(cos(th - AXIS));
  return uR * (1.0 - RI) * 0.5 * (0.26 + 0.74 * pow(c, 1.7)) * (1.0 + 0.05 * (fbm(vec2(th * 2.1, 7.7)) - 0.5));
}
// renflement sous le curseur (px ajoutés à la demi-épaisseur)
float bulge(vec2 p, float th, float rm) {
  vec2 q = uPtr.xy - p;
  float d = length(q);
  float near = exp(-pow(d / (uR * 0.34), 2.0));
  return uPtr.z * near * uR * 0.085;
}

// densité d'un passage du pinceau (lap = 0 : premier tour, 1 : recouvrement), et sa couverture (alpha)
float lap(vec2 p, float r, float th, float s, float total) {
  if (s > total || s < 0.0) return 0.0;
  float rm = midR(th), hw0 = halfW(th), hwMax = uR * (1.0 - RI) * 0.5;
  float hw = hw0 + bulge(p, th, rm);
  // départ : bout arrondi et gonflé d'encre ; fin du geste (recouvrement) : le trait s'affine en pointe sèche
  hw *= mix(0.55, 1.0, smoothstep(0.0, 0.025, s)) * (1.0 + 0.18 * exp(-s * 60.0));
  hw *= 1.0 - 0.8 * smoothstep(1.0, 1.0 + OV, s);
  // tête du pinceau pendant le geste : bout rond
  float arc = (uDraw * (1.0 + OV) - s) * TAU * rm;
  hw *= sqrt(clamp(1.0 - pow(max(0.0, 1.0 - arc / max(hw, 1.0)), 2.0), 0.0, 1.0));
  if (hw < 0.5) return 0.0;
  float v = (r - rm) / hw;                 // travers du trait (-1 à 1)
  float u = s * TAU * rm;                  // long du trait (px)
  float aa = 1.4 * uDpr / hw;
  // bord irrégulier (fibres) qui varie lentement
  float rough = 0.07 * (fbm(vec2(u / (uR * 0.05), v * 2.0 + uTime * 0.05)) - 0.5) + 0.03 * (vnoise(vec2(u / (uR * 0.008), 1.7)) - 0.5);
  float inside = smoothstep(1.0 + rough + aa, 1.0 + rough - aa, abs(v));
  if (inside <= 0.0) return 0.0;
  // charge d'encre : diminue le long du geste ; pleins chargés, déliés secs (épaisseur ⇒ densité)
  float thick = smoothstep(0.3, 0.95, hw0 / hwMax);
  float load = 1.0 - 0.45 * s;
  // fibres du pinceau : bruit très allongé le long du trait ; elles se séparent dans les déliés et quand l'encre manque
  float bristle = fbm(vec2(v * 7.5 + 11.0 * floor(s), u / (uR * 1.1)));
  float fine = vnoise(vec2(v * 38.0, u / (uR * 0.35)));
  float thr = 0.45 + 0.25 * thick + 0.15 * load;
  float dry = smoothstep(thr, thr + 0.1, bristle * 0.75 + fine * 0.25 + 0.1 * abs(v));
  float d = mix(0.55, 1.0, thick) * (1.0 - 0.8 * dry);
  d += 0.18 * smoothstep(0.7, 0.98, abs(v)) * (1.0 - dry);    // bord mouillé : l'encre s'y accumule
  d *= 0.9 + 0.1 * vnoise(gl_FragCoord.xy * 0.55);            // grain du papier
  return clamp(d, 0.0, 1.0) * inside;
}

void main() {
  vec2 c = uRes * 0.5;
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);     // y vers le bas (comme le curseur et la roue du kit)
  vec2 q = p - c;
  float r = length(q), th = atan(q.y, q.x);
  // geste : s = part de tour depuis le départ, sens inverse des aiguilles d'une montre (à l'écran)
  float s0 = fract((T0 - th) / TAU), total = uDraw * (1.0 + OV);
  float a0 = lap(p, r, th, s0, total), a1 = lap(p, r, th, s0 + 1.0, total);
  float ink = 1.0 - (1.0 - a0) * (1.0 - a1);

  // roue numérique : position sur la roue (0 en bas, sens horaire), anneau du kit, renflement du curseur
  float wheel = fract((degrees(atan(q.y, q.x)) + 90.0 - 180.0) / 360.0);
  float b = bulge(p, th, uR * 0.757);
  // passage : part de tour depuis le haut, sens horaire ; front large de W
  float f = fract(th / TAU + 0.25), W = 0.22;
  float k = clamp((uSweep.x * (1.0 + W) - f) / W, 0.0, 1.0);
  float dg = mix(uSweep.y, uSweep.z, k);                      // 0 : encre, 1 : numérique, à cet angle
  float g = smoothstep(0.0, 1.0, dg);
  // l'anneau numérique se forme depuis le trait d'encre : rayons interpolés
  float rm = midR(th), hw = halfW(th) + b;
  float ro = mix(rm + hw, uR + b, g), ri = mix(rm - hw, uR * RI - b * 0.4, g);
  // cellules : elles basculent dans le désordre près du front ; celles qui basculent sont pixelisées et brillent
  float cs = max(3.0 * uDpr, uR * 0.03);
  vec2 cell = floor(p / cs);
  float hc = h21(cell + 0.37);
  float on = step(hc, dg * 1.08 - 0.04);
  float edge = 1.0 - smoothstep(0.0, 0.09, abs(dg * 1.08 - 0.04 - hc));
  edge *= step(0.01, dg) * step(dg, 0.99);
  vec2 pc = edge > 0.2 ? (cell + 0.5) * cs : p;               // près du front : forme évaluée par cellule (pixels)
  float rc = length(pc - c), aa = 0.75 * uDpr;
  float ring = smoothstep(ro + aa, ro - aa, rc) * smoothstep(ri - aa, ri + aa, rc);
  vec3 iris = texture(uLut, vec2(wheel, 0.5)).rgb;
  vec3 col = mix(iris, vec3(1.0), 0.55 * edge);

  // composition (alpha prémultiplié) : encre là où l'anneau n'a pas basculé, roue là où il a basculé
  float aInk = ink * (1.0 - on) * (1.0 - 0.6 * edge);
  float aDig = ring * on;
  vec3 rgb = uInk * aInk * (1.0 - aDig) + col * aDig;
  float al = aDig + aInk * (1.0 - aDig);
  o = vec4(rgb, al);
}`

/** Monte le grand O dans `canvas`. Retourne { frame(now), toggle() } ou null sans WebGL 2. */
export function createRing(canvas, { reduced = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true })
  if (!gl) return null
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uRes', 'uR', 'uTime', 'uDraw', 'uSweep', 'uInk', 'uPtr', 'uDpr', 'uLut']) U[n] = gl.getUniformLocation(prog, n)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  let lutVersion = -1
  gl.uniform1i(U.uLut, 0)

  // taille
  let W = 0, H = 0, dpr = 1
  const fit = () => {
    dpr = Math.min(2, devicePixelRatio || 1)
    const r = canvas.getBoundingClientRect()
    W = Math.round(r.width * dpr); H = Math.round(r.height * dpr)
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }
  }
  new ResizeObserver(fit).observe(canvas); fit()

  // encre : couleur du thème (--ink)
  let ink = [0.118, 0.118, 0.118]
  const readInk = () => {
    const x = document.createElement('canvas').getContext('2d'); x.fillStyle = getComputedStyle(canvas).color
    const m = x.fillStyle.match(/^#(..)(..)(..)$/); if (m) ink = [1, 2, 3].map((i) => parseInt(m[i], 16) / 255)
  }
  readInk(); new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  // curseur (px de la toile), lissé ; présence qui monte et retombe
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, want: 0 }
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    ptr.tx = (e.clientX - r.left) * dpr; ptr.ty = (e.clientY - r.top) * dpr
    if (ptr.on < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty }
    ptr.want = 1
  }, { passive: true })
  document.addEventListener('pointerleave', () => { ptr.want = 0 })

  // déroulé : geste (DRAW), encre (HOLD), passage (SWEEP), roue (HOLD), passage retour… ; un clic avance d'une étape
  const DRAW = 2600, HOLD = 5200, SWEEP = 1900
  const t0 = performance.now()
  let phase = reduced ? 'ink' : 'draw', pt = t0, state = 0   // state : 0 encre, 1 numérique (état d'arrivée du passage)
  const next = (now) => {
    if (phase === 'draw' || phase === 'ink' && state === 0) { phase = 'sweep'; state = 1 }
    else if (phase === 'sweep') phase = state ? 'digital' : 'ink'
    else if (phase === 'digital') { phase = 'sweep'; state = 0 }
    else { phase = 'sweep'; state = 1 }
    pt = now
  }
  const toggle = () => {
    const now = performance.now()
    if (phase === 'sweep') return
    if (phase === 'draw') { phase = 'ink'; pt = now }
    next(now)
  }

  let last = t0
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now
    // déroulé
    const el = now - pt
    if (!reduced) {
      if (phase === 'draw' && el > DRAW) { phase = 'ink'; pt = now }
      else if ((phase === 'ink' || phase === 'digital') && el > HOLD) next(now)
      else if (phase === 'sweep' && el > SWEEP) next(now)
    }
    const e = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    const draw = phase === 'draw' ? e(Math.min(1, (now - pt) / DRAW)) : 1
    const sweep = phase === 'sweep' ? e(Math.min(1, (now - pt) / SWEEP)) : 0
    const from = phase === 'sweep' ? 1 - state : phase === 'digital' ? 1 : 0, to = phase === 'sweep' ? state : from

    // curseur
    const k = 1 - Math.exp(-dt / 0.12); ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k
    const R = Math.min(W, H) * 0.46
    const dx = ptr.x - W / 2, dy = ptr.y - H / 2, dr = Math.hypot(dx, dy)
    const near = ptr.want && dr > R * 0.3 && dr < R * 1.25 ? 1 : 0
    ptr.on += (near - ptr.on) * (1 - Math.exp(-dt / (near ? 0.18 : 0.45)))
    // roue survolée : la couleur sous le curseur s'élargit (flow.js) et teinte le fond (backdrop.js)
    const digital = phase === 'digital' || (phase === 'sweep' && state === 1 && sweep > 0.6)
    FLOW.hoverTarget = digital && near && dr > R * 0.45 && dr < R * 1.1 ? 1 : 0
    if (FLOW.hoverTarget) {
      FLOW.hoverU = ((Math.atan2(dy, dx) * 180 / Math.PI + 90 - 180) / 360 % 1 + 1) % 1
      const r = canvas.getBoundingClientRect(); FLOW.hoverX = r.left + r.width / 2; FLOW.hoverY = r.top + r.height / 2
    }
    if (FLOW.version !== lutVersion) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW.size, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, FLOW.lut)
      lutVersion = FLOW.version
    }

    gl.viewport(0, 0, W, H)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uR, R); gl.uniform1f(U.uDpr, dpr)
    gl.uniform1f(U.uTime, reduced ? 0 : (now - t0) / 1000)
    gl.uniform1f(U.uDraw, draw)
    gl.uniform3f(U.uSweep, sweep, from, to)
    gl.uniform3f(U.uInk, ...ink)
    gl.uniform3f(U.uPtr, ptr.x, ptr.y, reduced ? 0 : ptr.on)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  return { frame, toggle }
}
