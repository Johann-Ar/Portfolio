// Apparition tracée de JOHANN ARATA (accueil, comme celle du S) : carte du moment où chaque point du nom apparaît.
// node name-trace.mjs → public/media/name-along.png + src/name-trace-data.js
//
// Rien n'est redessiné : le nom vient du pack (public/logotypes/svg/johann-arata.svg), tramé à 1 px par unité.
// Deux boules partent du milieu de l'espace entre JOHANN et ARATA, une de chaque côté, et suivent le dessin : chemin le
// plus court à l'intérieur des lettres (les ligatures enchaînent les lettres). À chaque embranchement, le front se
// dédouble et fait apparaître l'impasse ; la boule principale continue. Le dessin est en trois morceaux soudés
// (JOH, ANN, ARATA) : de la goutte du A de JOHANN, la boule traverse le vide jusqu'au haut droit du H.
// Le trait naît de son axe avec un bout rond : un point apparaît dès qu'un disque inscrit (centre q, rayon = distance de
// q au bord) qui le contient a son centre atteint par le front. Carte : moment d'apparition (unités de chemin),
// 16 bits en R (fort) et V (faible), / AMAX. Hors des lettres : prolongée de quelques px (lecture bilinéaire nette au bord).
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync(new URL('../../public/logotypes/svg/johann-arata.svg', import.meta.url), 'utf8').replace(/currentColor/g, '#000')
const [, , W, H] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)   // 0 0 3052 344
const M = 40, w = W + 2 * M, h = H + 2 * M   // marge de la carte (unités = px)
// repères (unités du dessin) : centre de départ entre N et A, goutte du A de JOHANN, haut droit du H
const GOUTTE = [808, 90], HAUT_H = [770, 28]

const b = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {})
const p = await b.newPage()
const alpha = await p.evaluate(async ({ svg, W, H, M, w, h }) => {
  const img = new Image(); img.src = 'data:image/svg+xml,' + encodeURIComponent(svg); await img.decode()
  const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.drawImage(img, M, M, W, H)
  return Array.from(x.getImageData(0, 0, w, h).data.filter((_, i) => i % 4 === 3))
}, { svg, W, H, M, w, h })

const ink = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) ink[i] = alpha[i] > 127
// distance au bord (dedans), exacte (Felzenszwalb)
const D = (() => {
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

// composantes
const lab = new Int32Array(w * h).fill(-1); const comps = []
for (let i = 0; i < w * h; i++) if (ink[i] && lab[i] < 0) {
  const st = [i]; lab[i] = comps.length; let x0 = 1e9, x1 = -1
  while (st.length) {
    const j = st.pop(), x = j % w; x0 = Math.min(x0, x); x1 = Math.max(x1, x)
    for (const k of [j + 1, j - 1, j + w, j - w]) if (ink[k] && lab[k] < 0) { lab[k] = comps.length; st.push(k) }
  }
  comps.push({ x0: x0 - M, x1: x1 - M })
}
const big = comps.map((c, i) => ({ ...c, i })).filter((c) => c.x1 - c.x0 > 300).sort((a, b) => a.x0 - b.x0)
if (big.length !== 3) throw new Error(`3 morceaux attendus (JOH, ANN, ARATA), trouvé ${big.length}`)
const [cJOH, cANN, cARATA] = big
const C = [(cANN.x1 + cARATA.x0) / 2, H / 2]   // milieu de l'espace entre JOHANN et ARATA
// point le plus « plein » (centre du plus grand disque inscrit) d'un morceau près d'un repère
const ridgeNear = (pt, comp, R) => {
  let best = -1, bd = -1
  for (let y = Math.round(pt[1] - R); y <= pt[1] + R; y++) for (let x = Math.round(pt[0] - R); x <= pt[0] + R; x++) {
    if ((x - pt[0]) ** 2 + (y - pt[1]) ** 2 > R * R) continue
    const i = (y + M) * w + x + M; if (lab[i] === comp.i && D[i] > bd) { bd = D[i]; best = i }
  }
  if (best < 0) throw new Error('repère hors du morceau')
  return best
}
const nearest = (pt, comp) => { let best = -1, bd = 1e18; for (let i = 0; i < w * h; i++) if (lab[i] === comp.i) { const d = (i % w - M - pt[0]) ** 2 + ((i / w | 0) - M - pt[1]) ** 2; if (d < bd) { bd = d; best = i } } return best }
const xy = (i) => [i % w - M, (i / w | 0) - M]
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const seedN = ridgeNear(xy(nearest(C, cANN)), cANN, 26), seedA = ridgeNear(xy(nearest(C, cARATA)), cARATA, 26)
const drop = ridgeNear(GOUTTE, cANN, 30), topH = ridgeNear(HAUT_H, cJOH, 30)

// chemin le plus court dans les lettres (Dijkstra, 8 voisins), plus le saut goutte du A → haut du H
const T = new Float64Array(w * h).fill(Infinity), par = new Int32Array(w * h).fill(-1), order = []
const heap = []; const push = (i, t) => { heap.push([t, i]); let k = heap.length - 1; while (k) { const pk = (k - 1) >> 1; if (heap[pk][0] <= heap[k][0]) break; [heap[pk], heap[k]] = [heap[k], heap[pk]]; k = pk } }
const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m } } return top }
const t0N = dist(C, xy(seedN)), t0A = dist(C, xy(seedA))
T[seedN] = t0N; push(seedN, t0N); T[seedA] = t0A; push(seedA, t0A)
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]]
let jump = null
while (heap.length) {
  const [t, i] = pop(); if (t > T[i]) continue
  order.push(i)
  if (i === drop && !jump) { const L = dist(xy(drop), xy(topH)); jump = { t0: t, L }; if (t + L < T[topH]) { T[topH] = t + L; par[topH] = drop; push(topH, t + L) } }
  const x = i % w, y = i / w | 0
  for (const [dx, dy, c] of NB) { const k = (y + dy) * w + x + dx; if (ink[k] && t + c < T[k]) { T[k] = t + c; par[k] = i; push(k, t + c) } }
}
let unreached = 0; for (let i = 0; i < w * h; i++) if (ink[i] && T[i] === Infinity) unreached++
if (unreached > 50) throw new Error(`${unreached} px du nom jamais atteints`)

// chemin principal de chaque côté : du départ au point atteint en dernier (en suivant les ligatures, et le saut de la
// goutte du A au haut du H). Le trait qu'il parcourt (disques inscrits le long du chemin) garde la vitesse de la boule
// principale ; ailleurs (impasses, traits qui croisent), la boule secondaire part de son embranchement à vitesse réduite
const SLOW = 2   // les boules secondaires vont SLOW fois moins vite
const paths = {}, tube = new Uint8Array(w * h)
for (const [name, inA] of [['johann', false], ['arata', true]]) {
  let end = -1; for (let i = 0; i < w * h; i++) if (ink[i] && T[i] < Infinity && (lab[i] === cARATA.i) === inA && (end < 0 || T[i] > T[end])) end = i
  const chain = []; for (let i = end; i >= 0; i = par[i]) chain.push(i)
  chain.reverse()
  for (const q of chain) {
    const r = D[q] + 1.5, x = q % w, y = q / w | 0, R = Math.ceil(r)
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (xx * xx + yy * yy <= r * r) { const k = (y + yy) * w + x + xx; if (ink[k]) tube[k] = 1 }
  }
  // tracé simplifié (un point tous les ~12 unités, plus les deux bouts du saut), depuis le centre de départ
  const pts = [C.slice()]; let acc = 0
  chain.forEach((q, j) => {
    const prev = chain[j - 1], jumpEnd = prev === drop && q === topH
    acc += prev == null ? 0 : dist(xy(prev), xy(q))
    if (j === 0 || acc >= 12 || jumpEnd || prev === drop || j === chain.length - 1) { pts.push(xy(q)); acc = 0 }
  })
  paths[name] = pts
}
const anc = new Int32Array(w * h).fill(-1)
for (const i of order) anc[i] = tube[i] || par[i] < 0 ? i : anc[par[i]]
for (const i of order) if (!tube[i] && anc[i] >= 0) T[i] = T[anc[i]] + (T[i] - T[anc[i]]) * SLOW

// apparition : disques inscrits (centre q atteint au moment T[q], rayon D[q])
const A = new Float64Array(w * h).fill(Infinity)
for (let q = 0; q < w * h; q++) {
  if (!ink[q] || T[q] === Infinity) continue
  const r = D[q], x = q % w, y = q / w | 0, R = Math.floor(r), tq = T[q]
  // seulement les centres « pleins » (le disque d'un point du bord est inclus dans celui d'un point de l'axe)
  let ridge = true; for (const [dx, dy] of NB) if (D[(y + dy) * w + x + dx] > r + 0.75) { ridge = false; break }
  if (!ridge) continue   // (le chemin le plus court longe l'intérieur des virages : un point du bord y serait en avance)
  for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
    if (xx * xx + yy * yy > r * r) continue
    const k = (y + yy) * w + x + xx; if (tq < A[k]) A[k] = tq
  }
}
for (let i = 0; i < w * h; i++) if (ink[i] && A[i] === Infinity) A[i] = T[i]
// hors des lettres : prolongement (4 px) pour la lecture bilinéaire
for (let n = 0; n < 4; n++) { const B = A.slice(); for (let i = w; i < w * h - w; i++) if (B[i] === Infinity) { let m = Infinity; for (const k of [i + 1, i - 1, i + w, i - w]) m = Math.min(m, B[k]); A[i] = m } }
let AMAX = 0, DMAX = 0; for (let i = 0; i < w * h; i++) { if (ink[i] && A[i] > AMAX) AMAX = A[i]; if (ink[i]) DMAX = Math.max(DMAX, D[i]) }

// carte à demi-résolution (2 unités par px : le moment d'apparition varie doucement ; le bord des lettres, lui, vient
// du dessin vectoriel) : moyenne des valeurs connues de chaque bloc de 2 × 2
const w2 = w / 2, h2 = h / 2, rgba = new Uint8ClampedArray(w2 * h2 * 4)
for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
  let s = 0, n = 0; for (const k of [2 * y * w + 2 * x, 2 * y * w + 2 * x + 1, (2 * y + 1) * w + 2 * x, (2 * y + 1) * w + 2 * x + 1]) if (A[k] !== Infinity) { s += A[k]; n++ }
  const v = n ? Math.min(65534, Math.round(s / n / AMAX * 65534)) : 65535, i = y * w2 + x
  rgba[i * 4] = v >> 8; rgba[i * 4 + 1] = v & 255; rgba[i * 4 + 2] = 0; rgba[i * 4 + 3] = 255
}
const png = await p.evaluate(async ({ px, w, h }) => {
  const c = new OffscreenCanvas(w, h); c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0)
  const bl = await c.convertToBlob({ type: 'image/png' }); return Array.from(new Uint8Array(await bl.arrayBuffer()))
}, { px: Array.from(rgba), w: w2, h: h2 })
await b.close()
writeFileSync(new URL('../../public/media/name-along.png', import.meta.url), Buffer.from(png))

const r1 = (v) => Math.round(v * 10) / 10
const data = {
  map: { w: w2, h: h2, m: M, k: 0.5 }, amax: r1(AMAX), dmax: r1(DMAX),
  // boules dans le vide : départ (x, y, rayon), arrivée (x, y, rayon), moments de départ et d'arrivée (unités de chemin).
  // Le nom empilé (logotype-svg.js) déplace ARATA : name-trace.js décale les points de ce morceau
  balls: [
    { from: [...C, 0.35 * D[seedN]], to: [...xy(seedN), D[seedN]], t: [0, t0N], arata: false },
    { from: [...C, 0.35 * D[seedA]], to: [...xy(seedA), D[seedA]], t: [0, t0A], arata: true },
    { from: [...xy(drop), D[drop]], to: [...xy(topH), D[topH]], t: [jump.t0, jump.t0 + jump.L], arata: false },
  ].map((o) => ({ ...o, from: o.from.map(r1), to: o.to.map(r1), t: o.t.map(r1) })),
  // chemins principaux (unités du dessin), du centre de départ au bout de JOHANN et d'ARATA (battement, name-bulge.js)
  paths: { johann: paths.johann.map((p) => p.map(r1)), arata: paths.arata.map((p) => p.map(r1)) },
}
writeFileSync(new URL('../../src/name-trace-data.js', import.meta.url),
  `// généré par brand/tools/name-trace.mjs : apparition tracée de JOHANN ARATA (carte public/media/name-along.png)\nexport const NAME_TRACE = ${JSON.stringify(data)}\n`)
let fJ = 0, fA = 0; for (let i = 0; i < w * h; i++) if (ink[i]) { if (lab[i] === cARATA.i) fA = Math.max(fA, A[i]); else fJ = Math.max(fJ, A[i]) }
console.log(JSON.stringify(data), 'fin JOHANN', r1(fJ), 'fin ARATA', r1(fA), 'non atteints', unreached)
