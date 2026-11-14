/**
 * Lettrage HOLOSENE et gros logo S·o à l'encre de Chine (holosene.fr). Forme exacte du pack, rien n'est redessiné : le contour vient du
 * tracé vectoriel du SVG de la page, rendu à la résolution de l'écran (net à toute taille). La matière de l'encre vient
 * d'une simulation physique précalculée (holosene-bake.webp, brand/tools/ink-bake.mjs) : fibres du papier, pinceau qui
 * se vide dans les déliés, carbone porté par l'eau et déposé en séchant, bord mouillé plus chargé. La carte
 * holosene-ink.png (brand/tools/ink-map.mjs : distance au bord) délimite le calcul.
 * Apparition, une seule fois au chargement : le mot se trace tout seul, comme le nom du portfolio (une boule parcourt
 * les lettres, le trait naît derrière elle avec un bout rond ; carte holosene-along.png, brand/tools/ink-trace.mjs).
 * Ensuite, image fixe : aucun effet au survol.
 * Le logo S·o : la forme du gros logo de l'accueil, contraste d'épaisseur compris (monogram-shape.svg,
 * brand/tools/mono-shape.mjs, calculée depuis les cartes du kit), mêmes cartes et même rendu ; il se trace avant le mot.
 * Le SVG du logotype reste dans la page (lecteurs d'écran, repli sans WebGL 2) ; il est seulement rendu transparent.
 */
import hMap from './holosene-ink.png?url'
import hAlong from './holosene-along.png?url'
import hBake from './holosene-bake.webp?url'
import { TRACE as hTrace } from './holosene-trace.js'
import mMap from './monogram-ink.png?url'
import mAlong from './monogram-along.png?url'
import mBake from './monogram-bake.webp?url'
import { TRACE as mTrace } from './monogram-trace.js'

// cartes de brand/tools/ink-map.mjs (marge M, RES px par unité), ink-trace.mjs et ink-bake.mjs (BAKE_S px par unité) ;
// shape : contour net (groupe .mot du SVG de la page), redessiné à la taille de l'écran ; sans shape : l'image de la page
// elle-même (monogram-shape.svg : forme assez fine pour être réduite)
export const INK_ART = {
  holosene: { map: hMap, along: hAlong, bake: hBake, trace: hTrace, dur: 1500, shape: (svg) => svg.querySelector('.mot').outerHTML },
  monogram: { map: mMap, along: mAlong, bake: mBake, trace: mTrace, dur: 1000, bakeS: 3 },
}
const M = 40, RES = 1, BAKE_S = 1.5

const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;       // toile (px de l'écran)
uniform vec3 uBox;       // coin haut gauche du dessin (px de la toile), px par unité du dessin
uniform vec2 uMapK;      // conversion unités → coordonnées de la carte : (u + M) × RES / taille
uniform float uM;
uniform sampler2D uMap;
uniform sampler2D uMask;  // tracé vectoriel du mot rendu à la taille de l'écran (alpha), cadre = viewBox
uniform vec2 uVB;
uniform float uSeed;
uniform vec3 uInk;
uniform highp sampler2D uAlong;   // apparition tracée : moment où chaque point apparaît (holosene-along.png)
uniform float uAmax, uFront, uAK;   // uAK : px de la carte par unité      // moment le plus tardif, avancée du front (≥ 1e8 : mot entier)
uniform sampler2D uBake;  // densité de l'encre (holosene-bake.webp)
uniform vec2 uBakeK;     // conversion unités → coordonnées de la carte de densité
uniform vec4 uB[4];      // boules qui traversent le vide pendant le tracé : centre, rayon (unités), présence
out vec4 o;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

// moment d'apparition (unités de chemin) : 16 bits en R et V, interpolé à la main (précision)
float at(ivec2 ij) { vec2 c = texelFetch(uAlong, clamp(ij, ivec2(0), textureSize(uAlong, 0) - 1), 0).rg; return c.r * 65280.0 + c.g * 255.0; }
float along(vec2 u) {
  vec2 q = (u + uM) * uAK - 0.5, f = fract(q); ivec2 i = ivec2(floor(q));
  return mix(mix(at(i), at(i + ivec2(1, 0)), f.x), mix(at(i + ivec2(0, 1)), at(i + ivec2(1)), f.x), f.y) / 65534.0 * uAmax;
}

// densité simulée (de 0,70 à 1 en pratique) étalée sur toute la plage : la moitié la plus chargée de l'encre atteint
// la couleur pleine (celle du lien « Portfolio »), les zones sèches et les fibres descendent vers le fond
float inkD(vec2 u) {
  float r = texture(uBake, (u + uM) * uBakeK).r;
  return pow(clamp((r - 0.70) / 0.24, 0.0, 1.0), 1.3);
}

// encre en un point de la toile (px, y vers le bas) : alpha prémultiplié
float shade(vec2 p) {
  vec2 u = (p - uBox.xy) / uBox.z;                           // unités du dessin
  vec4 t = texture(uMap, (u + uM) * uMapK);
  float sd0 = t.r * 48.0 - 8.0;                              // distance au bord (unités, positive dedans)
  if (sd0 < -3.0) return 0.0;
  vec2 sp = u + uSeed * 37.0;
  // contour : le tracé vectoriel exact ; à peine irrégulier (l'encre mord le papier), sans flou
  vec2 jit = (vec2(fbm(sp * 0.06), fbm(sp * 0.06 + 9.3)) - 0.5) * 0.9;
  vec2 mu = (u + jit) / uVB;
  float mask = all(greaterThanEqual(mu, vec2(0.0))) && all(lessThanEqual(mu, vec2(1.0))) ? texture(uMask, mu).a : 0.0;
  // contour : celui du tracé vectoriel (couverture convertie en distance)
  float aa = 0.75 / uBox.z;
  float sdv = (mask - 0.5) * 2.0 * aa;
  float edge = sdv;
  // apparition tracée : le trait existe là où le front est passé (bout rond), plus les boules qui traversent le vide
  if (uFront < 1e8) {
    edge = min(edge, uFront - along(u));
    for (int i = 0; i < 4; i++) if (uB[i].w > 0.0) { float e = uB[i].z - length(u - uB[i].xy); edge = max(edge, e); }
  }
  float inside = smoothstep(-aa, aa, edge);
  if (inside <= 0.002) return 0.0;
  // densité de l'encre de Chine : simulation précalculée (brand/tools/ink-bake.mjs : fibres du papier, pinceau qui se
  // vide dans les déliés, carbone porté par l'eau et déposé en séchant, bord mouillé plus chargé). Dans les
  // boules du tracé (vide entre deux morceaux), encre pleine
  float d = inkD(u);
  if (uFront < 1e8) d = mix(d, 0.9, step(sd0, -0.5));       // boules du tracé dans le vide
  return clamp(d, 0.0, 1.0) * inside;
}

void main() {
  // suréchantillonnage 4 × (grille tournée) : bord, stries et grain sans crénelage
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float al = 0.25 * (shade(p + vec2(0.125, 0.375)) + shade(p + vec2(-0.375, 0.125)) + shade(p + vec2(0.375, -0.125)) + shade(p + vec2(-0.125, -0.375)));
  o = vec4(uInk * al, al);
}`

/**
 * Monte le rendu à l'encre de `art` (INK_ART) sur `svg` (son image dans la page, dont la boîte est le cadre du dessin).
 * Retourne { frame(now), play() } ou null sans WebGL 2 ; `onFail` est appelé si les cartes ne se chargent pas (l'image
 * reprend alors sa place), `onTraced` quand le dessin est entier (fin du tracé). Avec `wait`, rien ne s'affiche avant
 * play(). On ne dessine que quand quelque chose change (tracé, taille, thème).
 */
export function createInkWord(svg, { art = INK_ART.holosene, wait = false, reduced = false, onFail = () => {}, onTraced = () => {} } = {}) {
  const TRACE = art.trace, MAP = { url: art.map, M, RES, VB: TRACE.vb.slice(2) }
  const host = svg.parentElement
  const canvas = document.createElement('canvas')
  canvas.className = 'holo__ink'; canvas.setAttribute('aria-hidden', 'true')
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
  const U = {}; for (const n of ['uRes', 'uBox', 'uMapK', 'uM', 'uMap', 'uSeed', 'uInk', 'uMask', 'uVB', 'uAlong', 'uAmax', 'uFront', 'uB', 'uBake', 'uBakeK', 'uAK']) U[n] = gl.getUniformLocation(prog, n)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.uniform1i(U.uMap, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uAlong, 2); gl.uniform1i(U.uBake, 3)
  gl.uniform2f(U.uVB, ...MAP.VB); gl.uniform1f(U.uM, MAP.M); gl.uniform1f(U.uSeed, Math.random()); gl.uniform1f(U.uAmax, TRACE.amax); gl.uniform1f(U.uAK, TRACE.map.k)
  const texParams = (f) => {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  // contour net : le tracé du mot (groupe .mot du SVG de la page) rendu en image à 2 × la taille affichée
  const maskTex = gl.createTexture()
  let maskW = 0, maskTimer = 0
  async function makeMask() {
    const d = Math.min(3, devicePixelRatio || 1), sw = svg.getBoundingClientRect().width
    const w = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 8192, Math.max(512, Math.round(sw * d * 2))), h = Math.round(w * MAP.VB[1] / MAP.VB[0])
    if (w === maskW) return
    const src = !art.shape ? null : `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${MAP.VB.join(' ')}" width="${w}" height="${h}" style="color:#fff">${art.shape(svg)}</svg>`
    const url = src ? URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })) : null
    try {
      const im = new Image(); im.src = url || svg.currentSrc || svg.src; await im.decode()
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); texParams(gl.LINEAR)
      gl.activeTexture(gl.TEXTURE0)
      maskW = w; dirty = true
    } finally { if (url) URL.revokeObjectURL(url) }
  }
  // cartes (épaisseur, apparition) et contour chargés avant d'afficher quoi que ce soit : jusque-là, le titre est vide
  let ready = false, start = wait ? Infinity : 0, dirty = true, busy = true
  const load = (url) => { const im = new Image(); im.src = url; return im.decode().then(() => im) }
  Promise.all([load(MAP.url), load(art.along), load(art.bake), makeMask()]).then(([img, alongImg, bakeImg]) => {
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bakeImg); texParams(gl.LINEAR)
    gl.uniform2f(U.uBakeK, (art.bakeS || BAKE_S) / bakeImg.naturalWidth, (art.bakeS || BAKE_S) / bakeImg.naturalHeight)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, alongImg); texParams(gl.NEAREST)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); texParams(gl.LINEAR)
    gl.uniform2f(U.uMapK, MAP.RES / img.naturalWidth, MAP.RES / img.naturalHeight)
    host.append(canvas); fit()
    host.classList.add('ink-on'); host.classList.remove('ink-wait')
    ready = true; if (!wait) start = performance.now()
  }).catch((err) => { console.warn('encre du logotype indisponible', err); onFail() })

  // taille et position : la toile déborde du mot (renflement), le dessin est repéré par le cadre du SVG
  let dpr = 1, box = [0, 0, 1]
  const fit = () => {
    dpr = Math.min(3, devicePixelRatio || 1)
    const r = canvas.getBoundingClientRect(), s = svg.getBoundingClientRect()
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr)
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }
    box = [(s.left - r.left) * dpr, (s.top - r.top) * dpr, s.width / MAP.VB[0] * dpr]
    dirty = true
  }
  new ResizeObserver(() => {
    if (!ready) return
    fit(); clearTimeout(maskTimer); maskTimer = setTimeout(() => makeMask().catch((err) => console.warn(err)), 150)
  }).observe(host)

  // encre : couleur du thème (propriété color du titre)
  let ink = [0.118, 0.118, 0.118]
  const readInk = () => {
    const x = document.createElement('canvas').getContext('2d'); x.fillStyle = getComputedStyle(host).color
    const m = x.fillStyle.match(/^#(..)(..)(..)$/); if (m) ink = [1, 2, 3].map((i) => parseInt(m[i], 16) / 255)
    dirty = true
  }
  readInk(); new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  let done = false
  const DUR = art.dur, DELAY = 100   // tracé : durée (ms) et petit temps avant qu'il commence
  const ext = TRACE.amax + TRACE.dmax + 2
  const frame = (now) => {
    if (!ready || start === Infinity) return
    // apparition tracée, une seule fois au chargement (vitesse constante, comme une boule qui parcourt les lettres)
    const a = reduced ? 1 : Math.max(0, Math.min(1, (now - start - DELAY) / DUR))
    const front = a < 1 ? a * ext : 1e9
    if (a >= 1 && !done) { done = true; onTraced() }
    const active = a < 1
    if (!active && !busy && !dirty) return
    busy = active; dirty = false
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(U.uRes, canvas.width, canvas.height)
    gl.uniform3f(U.uBox, ...box)
    gl.uniform3f(U.uInk, ...ink)
    gl.uniform1f(U.uFront, front)
    const bl = new Float32Array(16)
    TRACE.balls.slice(0, 4).forEach((b, i) => {
      const k = (front - b.t[0]) / (b.t[1] - b.t[0]), on = k > 0 && front < b.t[1] + 2 * b.to[2], e = on ? Math.min(1, k) : 0
      bl.set([b.from[0] + (b.to[0] - b.from[0]) * e, b.from[1] + (b.to[1] - b.from[1]) * e, b.from[2] + (b.to[2] - b.from[2]) * e, on ? 1 : 0], i * 4)
    })
    gl.uniform4fv(U.uB, bl)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  // play() : départ du tracé (avant que les cartes soient prêtes : dès qu'elles le sont)
  const play = () => { if (start === Infinity) { wait = false; start = ready ? performance.now() : 0; dirty = true } }
  return { frame, play }
}
