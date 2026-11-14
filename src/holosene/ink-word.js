/**
 * Lettrage HOLOSENE à l'encre (holosene.fr), même direction artistique que le grand O : l'épaisseur du trait règle la
 * densité de l'encre. Les pleins et les gouttes sont noirs et saturés, les déliés clairs et secs (fibres du pinceau qui
 * se séparent) ; l'encre s'accumule sur les bords (bord mouillé), le bord est irrégulier, le papier a un grain.
 * Forme exacte du pack : carte holosene-ink.png (brand/tools/ink-map.mjs : distance au bord, demi-épaisseur
 * locale, distance lissée), rien n'est redessiné.
 * Apparition : l'encre imprègne d'abord les pleins puis gagne les déliés. Vivante : les fibres dérivent lentement, et
 * chaque visite tire un pinceau un peu différent. Curseur : le mot se renfle dessous (comme le S du logo) et l'encre y
 * est plus chargée (trait plus gras, plus foncé).
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
  // renflement : sous le curseur, le dessin est lu plus près du curseur (loupe douce, sans pli)
  vec2 dp = p - uPtr.xy;
  float R = 115.0 * uBox.z;
  float g = uPtr.z * exp(-dot(dp, dp) / (R * R));
  vec2 pw = p - dp * 0.3 * g;
  vec2 u = (pw - uBox.xy) / uBox.z;                          // unités du dessin
  vec4 t = texture(uMap, (u + uM) * uMapK);
  float sd = t.r * 48.0 - 8.0;                               // distance au bord (unités, positive dedans)
  if (sd < -4.0) { o = vec4(0.0); return; }
  float T = max(t.g * 48.0, 0.5);                            // demi-épaisseur locale (unités)
  vec2 sp = u + uSeed * 37.0;
  float tm = uTime * 0.012;
  // encre plus chargée sous le curseur
  sd += 1.4 * g; T += 7.0 * g;
  // bord irrégulier : fibres et petites bavures
  float rough = 1.5 * (fbm(sp * 0.06 + tm) - 0.5) + 0.7 * (vnoise(sp * 0.55) - 0.5);
  float aa = 0.9 / uBox.z;
  float e = sd + rough;
  float inside = smoothstep(-aa, aa, e);
  if (inside <= 0.0) { o = vec4(0.0); return; }
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
  const U = {}; for (const n of ['uRes', 'uBox', 'uMapK', 'uM', 'uMap', 'uTime', 'uReveal', 'uSeed', 'uInk', 'uPtr']) U[n] = gl.getUniformLocation(prog, n)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.uniform1i(U.uMap, 0); gl.uniform1f(U.uM, MAP.M); gl.uniform1f(U.uSeed, Math.random())

  // carte : chargée avant d'afficher quoi que ce soit (jusque-là, le SVG reste visible)
  let ready = false, start = 0
  const tex = gl.createTexture()
  const img = new Image()
  img.src = MAP.url
  img.decode().then(() => {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform2f(U.uMapK, MAP.RES / img.naturalWidth, MAP.RES / img.naturalHeight)
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
  new ResizeObserver(() => ready && fit()).observe(host)

  // encre : couleur du thème (propriété color du titre)
  let ink = [0.118, 0.118, 0.118]
  const readInk = () => {
    const x = document.createElement('canvas').getContext('2d'); x.fillStyle = getComputedStyle(host).color
    const m = x.fillStyle.match(/^#(..)(..)(..)$/); if (m) ink = [1, 2, 3].map((i) => parseInt(m[i], 16) / 255)
  }
  readInk(); new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  // curseur : position lissée, présence qui monte quand il passe sur le mot
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, want: 0 }
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    ptr.tx = (e.clientX - r.left) * dpr; ptr.ty = (e.clientY - r.top) * dpr
    ptr.want = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0
    if (ptr.on < 0.01) { ptr.x = ptr.tx; ptr.y = ptr.ty }
  }, { passive: true })
  document.addEventListener('pointerleave', () => { ptr.want = 0 })

  let last = performance.now()
  const frame = (now) => {
    if (!ready) return
    const dt = Math.min(0.1, (now - last) / 1000); last = now
    const f = 1 - Math.exp(-dt / 0.08)
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
