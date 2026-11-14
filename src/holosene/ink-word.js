/**
 * Lettrage HOLOSENE à l'encre (holosene.fr), même direction artistique que le grand O : l'épaisseur du trait règle la
 * densité de l'encre. Les pleins et les gouttes sont noirs et saturés, les déliés clairs et secs (fibres du pinceau qui
 * se séparent) ; l'encre s'accumule sur les bords (bord mouillé), le bord est irrégulier, le papier a un grain.
 * Forme exacte du pack, rien n'est redessiné : le contour vient du tracé vectoriel du SVG de la page, rendu à la
 * résolution de l'écran (net à toute taille) ; la carte holosene-ink.png (brand/tools/ink-map.mjs : distance au bord,
 * demi-épaisseur locale) donne l'épaisseur et le sens des fibres.
 * Apparition, une seule fois au chargement : le mot se trace tout seul, comme le nom du portfolio (une boule parcourt
 * les lettres, le trait naît derrière elle avec un bout rond ; carte holosene-along.png, brand/tools/ink-trace.mjs).
 * Ensuite, image fixe. Curseur : une balle passe dans le mot comme dans un collant. Elle n'existe que quand le curseur
 * touche une lettre, se pose sur l'axe du trait et l'élargit localement ; rien dans le vide entre les lettres.
 * Le SVG du logotype reste dans la page (lecteurs d'écran, repli sans WebGL 2) ; il est seulement rendu transparent.
 */
import mapUrl from './holosene-ink.png?url'
import alongUrl from './holosene-along.png?url'
import { TRACE } from './holosene-trace.js'

const MAP = { url: mapUrl, M: 40, RES: 0.5, VB: [2028, 343] }   // valeurs de brand/tools/ink-map.mjs

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
uniform vec4 uBall;      // balle du survol : centre (unités du dessin), rayon (unités), présence
uniform highp sampler2D uAlong;   // apparition tracée : moment où chaque point apparaît (holosene-along.png)
uniform float uAmax, uFront;      // moment le plus tardif, avancée du front (≥ 1e8 : mot entier)
uniform vec4 uB[4];      // boules qui traversent le vide pendant le tracé : centre, rayon (unités), présence
out vec4 o;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

float smax(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
// moment d'apparition (unités de chemin) : 16 bits en R et V, interpolé à la main (précision)
float at(ivec2 ij) { vec2 c = texelFetch(uAlong, clamp(ij, ivec2(0), textureSize(uAlong, 0) - 1), 0).rg; return c.r * 65280.0 + c.g * 255.0; }
float along(vec2 u) {
  vec2 q = (u + uM) * 0.5 - 0.5, f = fract(q); ivec2 i = ivec2(floor(q));
  return mix(mix(at(i), at(i + ivec2(1, 0)), f.x), mix(at(i + ivec2(0, 1)), at(i + ivec2(1)), f.x), f.y) / 65534.0 * uAmax;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 u = (p - uBox.xy) / uBox.z;                           // unités du dessin
  vec4 t = texture(uMap, (u + uM) * uMapK);
  float sd0 = t.r * 48.0 - 8.0;                              // distance au bord (unités, positive dedans)
  // balle dans un collant : centrée sur l'axe du trait touché par le curseur, elle l'élargit localement (union douce
  // du trait et d'un disque) ; rien dans le vide entre les lettres
  float bs = uBall.z - length(u - uBall.xy);
  float sd = uBall.w > 0.001 ? smax(sd0, bs, 12.0 * uBall.w) : sd0;
  if (sd < -4.0) { o = vec4(0.0); return; }
  float T = max(t.g * 48.0, 0.5);                            // demi-épaisseur locale (unités)
  T = mix(T, max(T, uBall.z), uBall.w * smoothstep(-10.0, 2.0, bs));   // la bosse est chargée comme un plein
  vec2 sp = u + uSeed * 37.0;
  // contour : le tracé vectoriel, lu un peu de travers (bord légèrement irrégulier, comme l'encre sur le papier)
  vec2 jit = vec2(fbm(sp * 0.05) - 0.5, fbm(sp * 0.05 + 9.3) - 0.5) * 1.6 + (vec2(vnoise(sp * 0.5), vnoise(sp * 0.5 + 4.1)) - 0.5) * 0.5;
  vec2 mu = (u + jit) / uVB;
  float mask = all(greaterThanEqual(mu, vec2(0.0))) && all(lessThanEqual(mu, vec2(1.0))) ? texture(uMask, mu).a : 0.0;
  // un seul contour : celui du tracé vectoriel (couverture convertie en distance, à un pixel près), qui laisse la place
  // à celui de la carte là où la balle gonfle le trait : pas de double bord
  float aa = 0.9 / uBox.z;
  float sdv = (mask - 0.5) * 2.0 * aa;
  float edge = mix(sdv, sd, smoothstep(0.0, 1.5, sd - sd0));
  // apparition tracée : le trait existe là où le front est passé (bout rond), plus les boules qui traversent le vide
  if (uFront < 1e8) {
    edge = min(edge, uFront - along(u));
    for (int i = 0; i < 4; i++) if (uB[i].w > 0.0) { float e = uB[i].z - length(u - uB[i].xy); edge = max(edge, e); T = max(T, uB[i].z * step(0.0, e)); sd = max(sd, e); }
  }
  float inside = smoothstep(-aa, aa, edge);
  if (inside <= 0.003) { o = vec4(0.0); return; }
  // épaisseur ⇒ densité : pleins saturés, déliés clairs
  float tn = clamp(T / 21.0, 0.0, 1.0);
  float thick = smoothstep(0.12, 0.85, tn);
  float acr = clamp(sd / T, 0.0, 1.0);                       // 0 au bord, 1 au cœur du trait
  // fibres du pinceau : elles suivent le bord du trait (lignes d'égale distance) et se resserrent dans les déliés
  float bend = 2.2 * fbm(sp * 0.012);
  float bristle = vnoise(vec2(acr * 11.0 + bend, 3.7 + uSeed * 5.0)) * 0.6 + fbm(sp * 0.035 + vec2(acr * 3.0, 0.0)) * 0.4;
  float fine = vnoise(vec2(acr * 46.0 + bend * 3.0, sp.x * 0.004 + sp.y * 0.004));
  float thr = 0.42 + 0.32 * thick;
  float dry = smoothstep(thr, thr + 0.12, bristle * 0.8 + fine * 0.2) * (1.0 - 0.85 * thick);
  dry *= smoothstep(2.0, 7.0, T * uBox.z);                   // trait de quelques pixels (petit écran) : pas de fibres, sinon moiré
  float d = mix(0.38, 1.0, pow(thick, 0.8)) * (1.0 - 0.75 * dry);
  d += 0.22 * (1.0 - smoothstep(0.0, 0.3, acr)) * (1.0 - dry) * (1.0 - thick * 0.6);   // bord mouillé
  d *= 0.9 + 0.1 * vnoise(gl_FragCoord.xy * 0.55);                                    // grain du papier
  float al = clamp(d, 0.0, 1.0) * inside;
  o = vec4(uInk * al, al);
}`

/**
 * Monte le lettrage à l'encre sur `svg` (logotype du pack dans la page). Retourne { frame(now) } ou null sans WebGL 2 ;
 * `onFail` est appelé si les cartes ne se chargent pas (le SVG reprend alors sa place).
 */
export function createInkWord(svg, { reduced = false, onFail = () => {} } = {}) {
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
  const U = {}; for (const n of ['uRes', 'uBox', 'uMapK', 'uM', 'uMap', 'uSeed', 'uInk', 'uBall', 'uMask', 'uVB', 'uAlong', 'uAmax', 'uFront', 'uB']) U[n] = gl.getUniformLocation(prog, n)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.uniform1i(U.uMap, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uAlong, 2)
  gl.uniform2f(U.uVB, ...MAP.VB); gl.uniform1f(U.uM, MAP.M); gl.uniform1f(U.uSeed, Math.random()); gl.uniform1f(U.uAmax, TRACE.amax)
  const texParams = (f) => {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  // contour net : le tracé du mot (groupe .mot du SVG de la page) rendu en image à 1,5 × la taille affichée
  const maskTex = gl.createTexture()
  let maskW = 0, maskTimer = 0
  async function makeMask() {
    const d = Math.min(2, devicePixelRatio || 1), sw = svg.getBoundingClientRect().width
    const w = Math.min(4096, Math.max(512, Math.round(sw * d * 1.5))), h = Math.round(w * MAP.VB[1] / MAP.VB[0])
    if (w === maskW) return
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.VB.join(' ')}" width="${w}" height="${h}" style="color:#fff">${svg.querySelector('.mot').outerHTML}</svg>`
    const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }))
    try {
      const im = new Image(); im.src = url; await im.decode()
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); texParams(gl.LINEAR)
      gl.activeTexture(gl.TEXTURE0)
      maskW = w
    } finally { URL.revokeObjectURL(url) }
  }
  // cartes (épaisseur, apparition) et contour chargés avant d'afficher quoi que ce soit : jusque-là, le titre est vide
  let ready = false, start = 0, sdMap = null
  const load = (url) => { const im = new Image(); im.src = url; return im.decode().then(() => im) }
  Promise.all([load(MAP.url), load(alongUrl), makeMask()]).then(([img, alongImg]) => {
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, alongImg); texParams(gl.NEAREST)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); texParams(gl.LINEAR)
    gl.uniform2f(U.uMapK, MAP.RES / img.naturalWidth, MAP.RES / img.naturalHeight)
    // distance au bord lue aussi côté processeur : la balle du survol se pose sur l'axe du trait touché
    const c2 = document.createElement('canvas'); c2.width = img.naturalWidth; c2.height = img.naturalHeight
    const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.drawImage(img, 0, 0)
    sdMap = { w: c2.width, h: c2.height, d: x2.getImageData(0, 0, c2.width, c2.height).data }
    host.append(canvas); fit()
    host.classList.add('ink-on'); host.classList.remove('ink-wait')
    ready = true; start = performance.now()
  }).catch((err) => { console.warn('encre du logotype indisponible', err); onFail() })

  // taille et position : la toile déborde du mot (renflement), le dessin est repéré par le cadre du SVG
  let dpr = 1, box = [0, 0, 1]
  const fit = () => {
    dpr = Math.min(2, devicePixelRatio || 1)
    const r = canvas.getBoundingClientRect(), s = svg.getBoundingClientRect()
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr)
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }
    box = [(s.left - r.left) * dpr, (s.top - r.top) * dpr, s.width / MAP.VB[0] * dpr]
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
  }
  readInk(); new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  // distance au bord (unités, positive dedans) en un point du dessin, lue dans la carte (interpolée)
  const sdAt = (x, y) => {
    const X = (x + MAP.M) * MAP.RES - 0.5, Y = (y + MAP.M) * MAP.RES - 0.5, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j
    const v = (a, b) => (a < 0 || b < 0 || a >= sdMap.w || b >= sdMap.h ? 0 : sdMap.d[(b * sdMap.w + a) * 4]) / 255 * 48 - 8
    return (v(i, j) * (1 - fx) + v(i + 1, j) * fx) * (1 - fy) + (v(i, j + 1) * (1 - fx) + v(i + 1, j + 1) * fx) * fy
  }
  // axe du trait sous un point : on remonte la distance au bord jusqu'à la crête (centre du plus grand disque inscrit)
  const ridge = (x, y) => {
    let s = sdAt(x, y)
    for (let n = 0; n < 60; n++) {
      const gx = sdAt(x + 1.5, y) - sdAt(x - 1.5, y), gy = sdAt(x, y + 1.5) - sdAt(x, y - 1.5), g = Math.hypot(gx, gy) / 3
      if (g < 0.3) break
      const nx = x + gx / (3 * g), ny = y + gy / (3 * g), ns = sdAt(nx, ny)
      if (ns <= s) break
      x = nx; y = ny; s = ns
    }
    return [x, y, s]
  }

  // balle du survol : elle n'existe que quand le curseur touche une lettre ; elle se pose sur l'axe du trait, glisse le
  // long des lettres avec le curseur et disparaît dès qu'il passe dans le vide
  const ball = { x: 0, y: 0, r: 0, on: 0, want: 0, tx: 0, ty: 0, tr: 0 }
  let traced = reduced
  addEventListener('pointermove', (e) => {
    if (!ready || !traced || reduced || e.pointerType !== 'mouse') { ball.want = 0; return }
    const r = canvas.getBoundingClientRect()
    const ux = ((e.clientX - r.left) * dpr - box[0]) / box[2], uy = ((e.clientY - r.top) * dpr - box[1]) / box[2]
    const s = sdAt(ux, uy)
    // sur une lettre (à 1,5 unité près ; un peu plus large quand la bosse est déjà là, pour ne pas clignoter à son bord)
    const on = s > (ball.want ? -1.5 - 8 * ball.on : -1.5)
    if (!on) { ball.want = 0; return }
    const [cx, cy, half] = ridge(ux, uy)
    // retour sur une lettre après un passage dans le vide : la balle renaît là, elle ne traverse pas le vide
    if (!ball.want && (ball.on < 0.05 || Math.hypot(cx - ball.x, cy - ball.y) > 2 * half)) { ball.on = 0; ball.x = cx; ball.y = cy; ball.r = half }
    ball.want = 1; ball.tx = cx; ball.ty = cy; ball.tr = half
  }, { passive: true })
  document.addEventListener('pointerleave', () => { ball.want = 0 })

  const DUR = 2600, DELAY = 200   // tracé : durée (ms) et petit temps avant qu'il commence
  const ext = TRACE.amax + TRACE.dmax + 2
  let last = performance.now()
  const frame = (now) => {
    if (!ready) return
    const dt = Math.min(0.1, (now - last) / 1000); last = now
    const f = 1 - Math.exp(-dt / 0.07)
    ball.x += (ball.tx - ball.x) * f; ball.y += (ball.ty - ball.y) * f; ball.r += (ball.tr - ball.r) * f
    ball.on += (ball.want - ball.on) * (1 - Math.exp(-dt / (ball.want ? 0.16 : 0.12)))
    // apparition tracée, une seule fois au chargement (vitesse constante, comme une boule qui parcourt les lettres)
    const a = reduced ? 1 : Math.max(0, Math.min(1, (now - start - DELAY) / DUR))
    const front = a < 1 ? a * ext : 1e9
    if (a >= 1) traced = true
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
    // rayon de la balle : caché dans le trait quand elle naît, puis plus large que le trait (le collant se tend)
    const on = ball.on < 0.002 ? 0 : ball.on
    gl.uniform4f(U.uBall, ball.x, ball.y, ball.r * 0.7 + (ball.r * 0.3 + 12) * on, on)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  return { frame }
}
