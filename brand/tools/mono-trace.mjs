// Apparition tracée du gros logo S·o pour son rendu à l'encre (src/holosene/ink-word.js), au format de ink-trace.mjs :
// node mono-trace.mjs → src/holosene/monogram-along.png + src/holosene/monogram-trace.js
//
// Comme l'apparition du S sur l'accueil (src/gl.js) : le S pousse le long de son axe (src/monogram-path.js), de son bout
// du haut à celui du bas, avec un bout rond de la demi-épaisseur locale ; puis le « o » se trace d'un seul geste, en
// partant du haut, dans le sens d'une plume (vers la gauche). Aucune boule dans le vide.
// Moment d'apparition d'un point à la distance d de l'axe, dont le pied est à l'abscisse s et la demi-épaisseur h :
// s + h − √(h² − d²) : le front, à f, découvre exactement un demi-disque de rayon h centré en f − h.
// Forme : src/holosene/monogram-shape.svg (brand/tools/mono-shape.mjs : cadre et échelle F du monogramme).
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { S_AXIS } from '../../src/monogram-path.js'

const svg = readFileSync(new URL('../../src/holosene/monogram-shape.svg', import.meta.url), 'utf8')
const [, , W, H] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const [x0, y0, F] = svg.match(/data-frame="([^"]+)"/)[1].split(' ').map(Number)
const M = 40, w = W + 2 * M, h = H + 2 * M
const GAP = 14   // pause entre le bout du S et le départ du « o » (unités de chemin)

const b = await chromium.launch()
const p = await b.newPage()
const alpha = await p.evaluate(async ({ svg, W, H, M, w, h }) => {
  const img = new Image(); img.src = 'data:image/svg+xml,' + encodeURIComponent(svg); await img.decode()
  const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.drawImage(img, M, M, W, H)
  return Array.from(x.getImageData(0, 0, w, h).data.filter((_, i) => i % 4 === 3))
}, { svg, W, H, M, w, h })
const ink = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) ink[i] = alpha[i] > 127
const D = (() => {   // distance au bord (dedans), exacte (Felzenszwalb)
  const INF = 1e12, f = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) f[i] = ink[i] ? INF : 0
  const pass = (n, get, set) => {
    const v = new Int32Array(n), z = new Float64Array(n + 1), g = new Float64Array(n)
    for (let q = 0; q < n; q++) g[q] = get(q)
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < n; q++) {
      let s; do { const r = v[k]; s = ((g[q] + q * q) - (g[r] + r * r)) / (2 * q - 2 * r) } while (s <= z[k] && --k >= 0)
      k++; v[k] = q; z[k] = s; z[k + 1] = INF
    }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; set(q, (q - v[k]) ** 2 + g[v[k]]) }
  }
  for (let x = 0; x < w; x++) pass(h, (y) => f[y * w + x], (y, v) => { f[y * w + x] = v })
  for (let y = 0; y < h; y++) pass(w, (x) => f[y * w + x], (x, v) => { f[y * w + x] = v })
  return Float64Array.from(f, Math.sqrt)
})()
const Dat = (x, y) => { const X = Math.round(x + M - 0.5), Y = Math.round(y + M - 0.5); return X < 0 || Y < 0 || X >= w || Y >= h ? 0 : D[Y * w + X] }

// axe du S en unités du dessin, abscisse curviligne et demi-épaisseur (plus grand disque inscrit) en chaque sommet
const ax = S_AXIS.map(([x, y]) => [(x - x0) * F, (y - y0) * F])
const L = [0]; for (let i = 1; i < ax.length; i++) L.push(L[i - 1] + Math.hypot(ax[i][0] - ax[i - 1][0], ax[i][1] - ax[i - 1][1]))
const hw = ax.map(([x, y]) => { let m = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) m = Math.max(m, Dat(x + i * 0.5, y + j * 0.5)); return m })
const LS = L[L.length - 1]
const onS = (x, y) => {   // pied sur l'axe : abscisse, distance, demi-épaisseur
  let best = [0, Infinity, hw[0]]
  for (let i = 1; i < ax.length; i++) {
    const [ax0, ay0] = ax[i - 1], [ax1, ay1] = ax[i], dx = ax1 - ax0, dy = ay1 - ay0, ll = dx * dx + dy * dy || 1
    const t = Math.min(1, Math.max(0, ((x - ax0) * dx + (y - ay0) * dy) / ll)), d = Math.hypot(x - ax0 - t * dx, y - ay0 - t * dy)
    if (d < best[1]) best = [L[i - 1] + t * (L[i] - L[i - 1]), d, hw[i - 1] + t * (hw[i] - hw[i - 1])]
  }
  return best
}
// « o » : anneau (centre, rayons) mesuré sur le morceau du dessin le plus à droite
let sx = 0, sy = 0, n = 0
for (let i = 0; i < w * h; i++) if (ink[i]) { const x = i % w - M + 0.5, y = (i / w | 0) - M + 0.5; if (onS(x, y)[1] > 2 * onS(x, y)[2] + 4) { sx += x; sy += y; n++ } }
const oc = [sx / n, sy / n]
let rIn = Infinity, rOut = 0
for (let i = 0; i < w * h; i++) if (ink[i]) { const x = i % w - M + 0.5, y = (i / w | 0) - M + 0.5, r = Math.hypot(x - oc[0], y - oc[1]); if (onS(x, y)[1] > 2 * onS(x, y)[2] + 4) { rIn = Math.min(rIn, r); rOut = Math.max(rOut, r) } }
const rMid = (rIn + rOut) / 2, hO = (rOut - rIn) / 2, LO = 2 * Math.PI * rMid
const O0 = LS + hw[hw.length - 1] + GAP   // départ du « o »
const onO = (x, y) => {   // départ en haut, vers la gauche (sens inverse des aiguilles d'une montre à l'écran)
  const a = Math.atan2(x - oc[0], -(y - oc[1]))   // 0 en haut, positif vers la droite
  const u = ((-a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return [O0 + u * rMid, Math.abs(Math.hypot(x - oc[0], y - oc[1]) - rMid), hO]
}
const at = (x, y) => {
  const s = onS(x, y), o = onO(x, y)
  const [sv, d, hh] = s[1] - s[2] <= o[1] - o[2] ? s : o
  // départ rond du « o » : juste avant son point de départ (fin du tour), le disque de rayon h centré au départ
  // apparaît avec lui (sinon le départ serait coupé net)
  if (sv === o[0]) { const back = sv - O0 - LO; if (back * back + d * d <= hh * hh) return O0 + hh - Math.sqrt(hh * hh - back * back - d * d) }
  const dd = Math.min(d, hh)
  return sv + hh - Math.sqrt(Math.max(0, hh * hh - dd * dd))
}
const AMAX = O0 + LO + hO

// carte à 1 unité par px (traits fins : le bout rond doit tenir sur plusieurs px)
const w2 = w, h2 = h, rgba = new Uint8ClampedArray(w2 * h2 * 4)
for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
  const ux = x + 0.5 - M, uy = y + 0.5 - M   // centre du texel (unités du dessin)
  let near = false; for (let j = -5; j <= 5 && !near; j++) for (let i = -5; i <= 5; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < w && Y < h && ink[Y * w + X]) { near = true; break } }
  const c = y * w2 + x, v = near ? Math.min(65534, Math.round(at(ux, uy) / AMAX * 65534)) : 65535
  rgba[c * 4] = v >> 8; rgba[c * 4 + 1] = v & 255; rgba[c * 4 + 2] = 0; rgba[c * 4 + 3] = 255
}
const png = await p.evaluate(async ({ px, w, h }) => {
  const c = new OffscreenCanvas(w, h); c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0)
  const bl = await c.convertToBlob({ type: 'image/png' }); return Array.from(new Uint8Array(await bl.arrayBuffer()))
}, { px: Array.from(rgba), w: w2, h: h2 })
await b.close()
writeFileSync(new URL('../../src/holosene/monogram-along.png', import.meta.url), Buffer.from(png))
const r1 = (v) => Math.round(v * 10) / 10
const DMAX = Math.max(...hw, hO)
const data = { map: { w: w2, h: h2, m: M, k: 1 }, amax: r1(AMAX), dmax: r1(DMAX), vb: [0, 0, W, H], balls: [] }
writeFileSync(new URL('../../src/holosene/monogram-trace.js', import.meta.url),
  `// généré par brand/tools/mono-trace.mjs : apparition tracée du logo S·o (carte monogram-along.png)\nexport const TRACE = ${JSON.stringify(data)}\n`)
console.log(`S ${r1(LS)} unités, « o » centre ${oc.map(r1)} rayons ${r1(rIn)}–${r1(rOut)}, AMAX ${r1(AMAX)}, demi-épaisseur max ${r1(DMAX)}`)
