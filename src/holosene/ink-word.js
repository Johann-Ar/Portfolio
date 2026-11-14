/**
 * Lettrage HOLOSENE à l'encre (holosene.fr), même direction artistique que le grand O : l'épaisseur du trait règle la
 * densité de l'encre. Les pleins et les gouttes sont noirs et saturés, les déliés clairs et secs (fibres du pinceau qui
 * se séparent) ; l'encre s'accumule sur les bords (bord mouillé), le bord est irrégulier, le papier a un grain.
 * Forme exacte du pack, rien n'est redessiné : le contour vient du tracé vectoriel du SVG de la page, rendu à la
 * résolution de l'écran (net à toute taille) ; la carte holosene-ink.png (brand/tools/ink-map.mjs : distance au bord,
 * demi-épaisseur locale) donne l'épaisseur et le sens des fibres.
 * Apparition : l'encre imprègne d'abord les pleins puis gagne les déliés. Vivante : les fibres dérivent lentement, et
 * chaque visite tire un pinceau un peu différent. Curseur : une balle passe dans le mot comme dans un collant (comme le
 * S du logo et JOHANN ARATA) : les traits s'épaississent en une bosse ronde, sans loupe ; elle ne naît que si le curseur
 * touche une lettre.
 * Le SVG du logotype reste dans la page (lecteurs d'écran, repli sans WebGL 2) ; il est seulement rendu transparent.
 */
import mapUrl from './holosene-ink.png?url'

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
uniform float uTime, uReveal, uSeed;
uniform vec3 uInk;
uniform vec3 uPtr;       // curseur (px de la toile, y vers le bas), présence
out vec4 o;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 u = (p - uBox.xy) / uBox.z;                           // unités du dessin
  // balle dans un collant : sous le curseur, les traits s'épaississent (bosse ronde), sans loupe
  vec2 dp = (p - uPtr.xy) / uBox.z;
  float g = uPtr.z * exp(-dot(dp, dp) / (62.0 * 62.0));
  vec4 t = texture(uMap, (u + uM) * uMapK);
  float sd = t.r * 48.0 - 8.0 + 10.0 * g;                    // distance au bord (unités, positive dedans), bosse comprise
  if (sd < -4.0) { o = vec4(0.0); return; }
  float T = max(t.g * 48.0, 0.5) + 18.0 * g;                 // demi-épaisseur locale (unités) : la bosse est plus chargée
  vec2 sp = u + uSeed * 37.0;
  float tm = uTime * 0.012;
  // contour : le tracé vectoriel, lu un peu de travers (bord légèrement irrégulier, comme l'encre sur le papier)
  vec2 jit = vec2(fbm(sp * 0.05 + tm) - 0.5, fbm(sp * 0.05 + 9.3 - tm) - 0.5) * 1.6 + (vec2(vnoise(sp * 0.5), vnoise(sp * 0.5 + 4.1)) - 0.5) * 0.5;
  vec2 mu = (u + jit) / uVB;
  float mask = all(greaterThanEqual(mu, vec2(0.0))) && all(lessThanEqual(mu, vec2(1.0))) ? texture(uMask, mu).a : 0.0;
  // un seul contour : celui du tracé vectoriel (couverture convertie en distance, à un pixel près), qui laisse la place
  // à celui de la carte (distance au bord + bosse) là où la balle gonfle le trait : pas de double bord ni de fondu
  float aa = 0.9 / uBox.z;
  float sdv = (mask - 0.5) * 2.0 * aa;
  float inside = smoothstep(-aa, aa, mix(sdv, sd, smoothstep(0.0, 0.3, g)));
  if (inside <= 0.003) { o = vec4(0.0); return; }
  // épaisseur ⇒ densité : pleins saturés, déliés clairs
  float tn = clamp(T / 21.0, 0.0, 1.0);
  float thick = smoothstep(0.12, 0.85, tn);
  float acr = clamp(sd / T, 0.0, 1.0);                       // 0 au bord, 1 au cœur du trait
  // fibres du pinceau : elles suivent le bord du trait (lignes d'égale distance) et se resserrent dans les déliés ;
  // un bruit lent les interrompt le long du trait
  float bend = 2.2 * fbm(sp * 0.012 + tm * 0.5);
  float bristle = vnoise(vec2(acr * 11.0 + bend, 3.7 + uSeed * 5.0)) * 0.6 + fbm(sp * 0.035 + vec2(acr * 3.0, tm)) * 0.4;
  float fine = vnoise(vec2(acr * 46.0 + bend * 3.0, sp.x * 0.004 + sp.y * 0.004));
  float thr = 0.42 + 0.32 * thick;
  float dry = smoothstep(thr, thr + 0.12, bristle * 0.8 + fine * 0.2) * (1.0 - 0.85 * thick);
  dry *= smoothstep(2.0, 7.0, T * uBox.z);                   // trait de quelques pixels (petit écran) : pas de fibres, sinon moiré
  float d = mix(0.38, 1.0, pow(thick, 0.8)) * (1.0 - 0.75 * dry);
  d += 0.22 * (1.0 - smoothstep(0.0, 0.3, acr)) * (1.0 - dry) * (1.0 - thick * 0.6);   // bord mouillé
  d *= 0.9 + 0.1 * vnoise(gl_FragCoord.xy * 0.55);                                    // grain du papier
  // apparition : l'encre imprègne d'abord les pleins, puis gagne les déliés ; du cœur vers les bords
  // front net et irrégulier, comme de l'encre qui gagne le papier (pas un fondu)
  float k = uReveal * 1.35 - (1.0 - tn) * 0.9 - (1.0 - acr) * 0.2 + 0.07 * (fbm(sp * 0.09) - 0.5);
  float rev = smoothstep(0.0, 0.03, k);
  float al = clamp(d, 0.0, 1.0) * inside * rev;
  o = vec4(uInk * al, al);
}`

/** Monte le lettrage à l'encre sur `svg` (logotype du pack dans la page). Retourne { frame(now) } ou null sans WebGL 2. */
export function createInkWord(svg, { reduced = false } = {}) {
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
  const U = {}; for (const n of ['uRes', 'uBox', 'uMapK', 'uM', 'uMap', 'uTime', 'uReveal', 'uSeed', 'uInk', 'uPtr', 'uMask', 'uVB']) U[n] = gl.getUniformLocation(prog, n)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.uniform1i(U.uMap, 0); gl.uniform1i(U.uMask, 1); gl.uniform2f(U.uVB, ...MAP.VB); gl.uniform1f(U.uM, MAP.M); gl.uniform1f(U.uSeed, Math.random())

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
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.activeTexture(gl.TEXTURE0)
      maskW = w
    } finally { URL.revokeObjectURL(url) }
  }
  // carte : chargée avant d'afficher quoi que ce soit (jusque-là, le SVG reste visible)
  let ready = false, start = 0
  const tex = gl.createTexture()
  const img = new Image()
  img.src = MAP.url
  Promise.all([img.decode(), makeMask()]).then(() => {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform2f(U.uMapK, MAP.RES / img.naturalWidth, MAP.RES / img.naturalHeight)
    // distance au bord lue aussi côté processeur : la balle ne naît que si le curseur touche une lettre
    const c2 = document.createElement('canvas'); c2.width = img.naturalWidth; c2.height = img.naturalHeight
    const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.drawImage(img, 0, 0)
    sdMap = { w: c2.width, h: c2.height, d: x2.getImageData(0, 0, c2.width, c2.height).data }
    host.append(canvas); host.classList.add('ink-on'); fit()
    ready = true; start = performance.now()
  }).catch((err) => console.warn('encre du logotype indisponible', err))

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

  // curseur : position lissée, présence qui monte quand il passe sur le mot
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, want: 0 }
  let sdMap = null
  const touches = (px, py) => {   // px, py : px de la toile → le curseur est-il sur une lettre (à 2 unités près) ?
    if (!sdMap) return false
    const X = Math.round(((px - box[0]) / box[2] + MAP.M) * MAP.RES), Y = Math.round(((py - box[1]) / box[2] + MAP.M) * MAP.RES)
    if (X < 0 || Y < 0 || X >= sdMap.w || Y >= sdMap.h) return false
    return sdMap.d[(Y * sdMap.w + X) * 4] / 255 * 48 - 8 > -2
  }
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    ptr.tx = (e.clientX - r.left) * dpr; ptr.ty = (e.clientY - r.top) * dpr
    // seulement à la souris ; la balle naît sur une lettre, puis suit le curseur tant qu'il reste sur le mot
    const onWord = e.pointerType === 'mouse' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    ptr.want = onWord && (ptr.want || touches(ptr.tx, ptr.ty)) ? 1 : 0
    if (ptr.on < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty }
  }, { passive: true })
  document.addEventListener('pointerleave', () => { ptr.want = 0 })

  let last = performance.now()
  const frame = (now) => {
    if (!ready) return
    const dt = Math.min(0.1, (now - last) / 1000); last = now
    const f = 1 - Math.exp(-dt / 0.12)   // la balle suit le curseur avec un léger retard
    ptr.x += (ptr.tx - ptr.x) * f; ptr.y += (ptr.ty - ptr.y) * f
    ptr.on += (ptr.want - ptr.on) * (1 - Math.exp(-dt / (ptr.want ? 0.18 : 0.5)))
    const reveal = reduced ? 1 : Math.min(1, (now - start) / 1800)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(U.uRes, canvas.width, canvas.height)
    gl.uniform3f(U.uBox, ...box)
    gl.uniform1f(U.uTime, reduced ? 0 : now / 1000)
    gl.uniform1f(U.uReveal, 1 - Math.pow(1 - reveal, 2))
    gl.uniform3f(U.uInk, ...ink)
    gl.uniform3f(U.uPtr, ptr.x, ptr.y, reduced ? 0 : ptr.on)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  return { frame }
}
