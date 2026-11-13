/**
 * Apparition tracée du nom de l'accueil (JOHANN ARATA), comme celle du S du logo : deux boules partent de l'espace entre
 * JOHANN et ARATA, une de chaque côté, et le trait naît derrière elles, de son axe, avec un bout rond. Aux embranchements
 * la boule se dédouble (les impasses apparaissent) ; la principale enchaîne les lettres par les ligatures et, entre le A
 * et le H de JOHANN (morceaux séparés), traverse le vide de la goutte du A jusqu'au haut du H.
 *
 * Carte du moment d'apparition de chaque point : public/media/name-along.png et src/name-trace-data.js
 * (brand/tools/name-trace.mjs, calculées sur le dessin exact du pack). Dessin dans un petit canvas WebGL posé sur le SVG
 * pendant le tracé : lettres rendues par le navigateur (texture à la résolution de l'écran) × carte seuillée au front,
 * plus les boules dans le vide. Avant (rien) et après (nom entier), c'est le SVG d'origine qui s'affiche.
 */
import { NAME_TRACE as N } from './name-trace-data.js'

const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x * 0.5 + 0.5, 0.5 - aP.y * 0.5); gl_Position = vec4(aP, 0.0, 1.0); }`
const FS = `precision highp float;
varying vec2 vUv;                 // 0 à 1, y vers le bas
uniform sampler2D uL, uA;         // lettres (alpha), carte d'apparition (16 bits : r fort, g faible)
uniform vec4 uVb;                 // cadre du SVG (unités du dessin)
uniform vec3 uMap;                // carte : largeur, hauteur (px), px par unité
uniform float uM, uAmax, uFront, uPx;   // marge de la carte, moment le plus tardif, front, unités par pixel de l'écran
uniform vec3 uStack;              // nom empilé : décalage d'ARATA (x, y), limite (y) ; z ≤ 0 : nom sur une ligne
uniform vec4 uB0, uB1, uB2;       // boules dans le vide : centre, rayon (unités), présence
uniform vec3 uInk;
float at(vec2 ij) { vec2 c = texture2D(uA, (clamp(ij, vec2(0.0), uMap.xy - 1.0) + 0.5) / uMap.xy).rg; return c.r * 65280.0 + c.g * 255.0; }
float ball(vec2 u, vec4 b) { return b.w * clamp(0.5 - (length(u - b.xy) - b.z) / uPx, 0.0, 1.0); }
void main() {
  vec2 u = uVb.xy + vUv * uVb.zw, m = u;
  if (uStack.z > 0.0 && u.y > uStack.z) m -= uStack.xy;
  // lecture bilinéaire des valeurs décodées (une lecture filtrée mêlerait les octets)
  vec2 g = (m + uM) * uMap.z - 0.5, i0 = floor(g), f = g - i0;
  float A = mix(mix(at(i0), at(i0 + vec2(1.0, 0.0)), f.x), mix(at(i0 + vec2(0.0, 1.0)), at(i0 + vec2(1.0)), f.x), f.y) / 65534.0 * uAmax;
  float a = texture2D(uL, vUv).a * clamp((uFront - A) / uPx + 0.5, 0.0, 1.0);
  a = max(a, max(ball(u, uB0), max(ball(u, uB1), ball(u, uB2))));
  gl_FragColor = vec4(uInk * a, a);
}`
const MAX_PX = 3200

const svgToCanvas = (src, w, h) => {
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }))
  const img = new Image(); img.src = url
  return img.decode().then(() => {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h })
    c.getContext('2d').drawImage(img, 0, 0, w, h)
    return c
  }).finally(() => URL.revokeObjectURL(url))
}

export function nameTrace(svg, mapUrl) {
  const holder = svg.parentElement, vb = svg.viewBox.baseVal
  const letters = svg.querySelector('[id^="bal-l-"]')
  const st = svg.dataset.empile ? svg.dataset.empile.split(' ').map(Number) : null   // dx dy limite
  const cv = document.createElement('canvas')
  cv.className = 'name-trace'; cv.setAttribute('aria-hidden', 'true')
  cv.style.cssText = 'position:absolute;pointer-events:none;visibility:hidden'
  holder.style.position ||= 'relative'
  svg.before(cv)
  const api = { ready: false, shown: false }
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false })
  if (!gl) return api
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o }
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return api
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aP = gl.getAttribLocation(prog, 'aP'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)
  const U = {}; for (const n of ['uL', 'uA', 'uVb', 'uMap', 'uM', 'uAmax', 'uFront', 'uPx', 'uStack', 'uB0', 'uB1', 'uB2', 'uInk']) U[n] = gl.getUniformLocation(prog, n)
  const tex = (unit, nearest) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t)
    const f = nearest ? gl.NEAREST : gl.LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const tL = tex(0, false), tA = tex(1, true)
  gl.uniform1i(U.uL, 0); gl.uniform1i(U.uA, 1)
  gl.uniform4f(U.uVb, vb.x, vb.y, vb.width, vb.height)
  gl.uniform3f(U.uMap, N.map.w, N.map.h, N.map.k); gl.uniform1f(U.uM, N.map.m); gl.uniform1f(U.uAmax, N.amax)
  gl.uniform3f(U.uStack, st ? st[0] : 0, st ? st[1] : 0, st ? st[2] : 0)
  // boules dans le vide, aux coordonnées de ce SVG (nom empilé : ARATA décalé) ; les deux du départ partent du milieu
  // de leurs deux points d'arrivée
  const off = (o, p) => o.arata && st ? [p[0] + st[0], p[1] + st[1], p[2]] : p
  const balls = N.balls.map((o) => ({ ...o, to: off(o, o.to) }))
  const mid = [(balls[0].to[0] + balls[1].to[0]) / 2, (balls[0].to[1] + balls[1].to[1]) / 2]
  balls[0].from = [...mid, balls[0].from[2]]; balls[1].from = [...mid, balls[1].from[2]]

  let mapOk = false, lettersOk = false, pxW = 0, pxH = 0, last = null, building = 0
  const im = new Image()
  im.onload = () => {
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tA)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im)
    mapOk = true; check()
  }
  im.src = mapUrl

  const readInk = () => {
    const c = getComputedStyle(svg).color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0]
    gl.uniform3f(U.uInk, c[0] / 255, c[1] / 255, c[2] / 255)
    if (api.shown && last != null) api.draw(last)
  }
  new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readInk)
  const check = () => { const r = mapOk && lettersOk; if (r && !api.ready) { api.ready = true; readInk() } if (r && last != null) api.draw(last) }

  // lettres rendues par le navigateur, en blanc, aux pixels de l'écran
  const build = () => {
    const r = svg.getBoundingClientRect(), hr = holder.getBoundingClientRect()
    if (!r.width) return
    Object.assign(cv.style, { left: `${r.left - hr.left}px`, top: `${r.top - hr.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    const k = Math.min(devicePixelRatio || 1, MAX_PX / r.width)
    const w = Math.round(r.width * k), h = Math.round(r.height * k)
    if (w === pxW && h === pxH) return
    pxW = w; pxH = h
    const id = ++building
    const g = letters.cloneNode(true); g.removeAttribute('id')
    for (const n of [g, ...g.querySelectorAll('[fill]')]) if (n.getAttribute('fill') === 'currentColor') n.setAttribute('fill', '#fff')
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" width="${w}" height="${h}" preserveAspectRatio="none">${new XMLSerializer().serializeToString(g)}</svg>`
    svgToCanvas(src, w, h).then((c) => {
      if (id !== building) return
      cv.width = w; cv.height = h; gl.viewport(0, 0, w, h)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tL)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
      gl.uniform1f(U.uPx, vb.width / w)
      lettersOk = true; check()
    }).catch(() => {})
  }
  new ResizeObserver(build).observe(svg)

  /** Avancée du tracé, de 0 (rien) à 1 (nom entier). */
  api.draw = (a) => {
    last = a
    if (!api.ready) return
    const front = a * (N.amax + N.dmax + 2)
    gl.uniform1f(U.uFront, front)
    balls.forEach((b, i) => {
      const k = (front - b.t[0]) / (b.t[1] - b.t[0]), on = k > 0 && k < 1
      const e = on ? k : 0   // même vitesse que le front dans les lettres
      gl.uniform4f(U[`uB${i}`], b.from[0] + (b.to[0] - b.from[0]) * e, b.from[1] + (b.to[1] - b.from[1]) * e, b.from[2] + (b.to[2] - b.from[2]) * e, on ? 1 : 0)
    })
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  /** Tracé en cours : le canvas à la place du SVG. */
  api.show = (on) => {
    if (on === api.shown) return
    api.shown = on
    cv.style.visibility = on ? 'visible' : 'hidden'
    svg.classList.toggle('tr-on', on)
  }
  return api
}
