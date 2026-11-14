// Apparition tracée d'un logotype du pack pour son rendu à l'encre (src/holosene/ink-word.js), même principe que celle de
// JOHANN ARATA (name-trace.mjs) : une boule parcourt le dessin et le trait naît derrière elle, avec un bout rond.
// node ink-trace.mjs [holosene] → src/holosene/<mot>-along.png + src/holosene/<mot>-trace.js
//
// Rien n'est redessiné : le mot vient du pack (public/logotypes/svg/<mot>.svg), tramé à 1 px par unité.
// La boule part du haut du premier jambage à gauche et suit le chemin le plus court à l'intérieur des lettres. D'un
// morceau du dessin au suivant (de gauche à droite), elle traverse le vide entre leurs deux points les plus proches.
// Dans chaque morceau, le chemin principal (de l'entrée à la sortie vers le morceau suivant) garde la vitesse de la boule ;
// les embranchements sont tracés par des fronts secondaires, SLOW fois moins vite.
// Carte : moment d'apparition (unités de chemin), 16 bits en R (fort) et V (faible), / AMAX, 2 unités par px.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const mot = process.argv[2] || 'holosene'
const svg = readFileSync(new URL(`../../public/logotypes/svg/${mot}.svg`, import.meta.url), 'utf8').replace(/currentColor/g, '#000')
const [VX, VY, W, H] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const M = 40, w = W + 2 * M, h = H + 2 * M
const SLOW = 2

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
const xy = (i) => [i % w - M, (i / w | 0) - M]
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]]

// morceaux du dessin (de gauche à droite), avec leurs pixels de bord
const lab = new Int32Array(w * h).fill(-1); const comps = []
for (let i = 0; i < w * h; i++) if (ink[i] && lab[i] < 0) {
  const st = [i], px = []; lab[i] = comps.length
  while (st.length) {
    const j = st.pop(); px.push(j)
    for (const k of [j + 1, j - 1, j + w, j - w]) if (ink[k] && lab[k] < 0) { lab[k] = comps.length; st.push(k) }
  }
  comps.push({ id: comps.length, px, cx: px.reduce((s, j) => s + j % w, 0) / px.length })
}
for (const c of comps) c.edge = c.px.filter((j) => !ink[j + 1] || !ink[j - 1] || !ink[j + w] || !ink[j - w])
const seq = comps.filter((c) => c.px.length > 20).sort((a, b) => a.cx - b.cx)
const ridgeNear = (pt, comp, R) => {   // centre du plus grand disque inscrit d'un morceau près d'un repère
  let best = -1, bd = -1
  for (let y = Math.round(pt[1] - R); y <= pt[1] + R; y++) for (let x = Math.round(pt[0] - R); x <= pt[0] + R; x++) {
    const i = (y + M) * w + x + M; if (i < 0 || i >= w * h || (x - pt[0]) ** 2 + (y - pt[1]) ** 2 > R * R) continue
    if (lab[i] === comp.id && D[i] > bd) { bd = D[i]; best = i }
  }
  return best
}

// tas binaire
const heap = []; const push = (i, t) => { heap.push([t, i]); let k = heap.length - 1; while (k) { const pk = (k - 1) >> 1; if (heap[pk][0] <= heap[k][0]) break; [heap[pk], heap[k]] = [heap[k], heap[pk]]; k = pk } }
const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m } } return top }

// départ : haut du premier jambage (point du premier morceau le plus en haut à gauche)
let first = seq[0].px[0]; for (const j of seq[0].px) { const [x, y] = xy(j), [fx, fy] = xy(first); if (x + y < fx + fy) first = j }
let entry = ridgeNear(xy(first), seq[0], 40), tEntry = 0
const T = new Float64Array(w * h).fill(Infinity), par = new Int32Array(w * h).fill(-1), order = [], tube = new Uint8Array(w * h)
const seeds = [], balls = []
seq.forEach((c, n) => {
  T[entry] = tEntry; push(entry, tEntry); seeds.push(entry)
  while (heap.length) {
    const [t, i] = pop(); if (t > T[i]) continue
    order.push(i)
    const x = i % w, y = i / w | 0
    for (const [dx, dy, cc] of NB) { const k = (y + dy) * w + x + dx; if (ink[k] && t + cc < T[k]) { T[k] = t + cc; par[k] = i; push(k, t + cc) } }
  }
  // sortie : point du morceau le plus proche du suivant (dernier morceau : point atteint en dernier)
  const next = seq[n + 1]
  let exit = -1, land = -1
  if (next) {
    let bd = Infinity, a = -1, bb = -1
    for (const i of c.edge) { const pi = xy(i); for (const j of next.edge) { const d = (pi[0] - j % w + M) ** 2 + (pi[1] - (j / w | 0) + M) ** 2; if (d < bd) { bd = d; a = i; bb = j } } }
    exit = ridgeNear(xy(a), c, 30); land = ridgeNear(xy(bb), next, 30)
  } else { for (const i of c.px) if (T[i] < Infinity && (exit < 0 || T[i] > T[exit])) exit = i }
  for (let q = exit; q >= 0; q = par[q]) {   // chemin principal : disques inscrits le long du chemin
    const r = D[q] + 1.5, x = q % w, y = q / w | 0, R = Math.ceil(r)
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (xx * xx + yy * yy <= r * r) { const k = (y + yy) * w + x + xx; if (lab[k] === c.id) tube[k] = 1 }
    if (q === entry) break
  }
  if (next) {
    const L = dist(xy(exit), xy(land))
    balls.push({ from: [...xy(exit), D[exit]], to: [...xy(land), D[land]], t: [T[exit], T[exit] + L] })
    entry = land; tEntry = T[exit] + L
  }
})
let unreached = 0; for (let i = 0; i < w * h; i++) if (ink[i] && T[i] === Infinity) unreached++
const anc = new Int32Array(w * h).fill(-1)
for (const i of order) anc[i] = tube[i] || par[i] < 0 ? i : anc[par[i]]
for (const i of order) if (!tube[i] && anc[i] >= 0) T[i] = T[anc[i]] + (T[i] - T[anc[i]]) * SLOW

// apparition : disques inscrits (centre q atteint au moment T[q], rayon D[q]) ; seulement les centres « pleins »
const A = new Float64Array(w * h).fill(Infinity)
for (let q = 0; q < w * h; q++) {
  if (!ink[q] || T[q] === Infinity) continue
  const r = D[q], x = q % w, y = q / w | 0, R = Math.floor(r), tq = T[q]
  let ridge = true; for (const [dx, dy] of NB) if (D[(y + dy) * w + x + dx] > r + 0.75) { ridge = false; break }
  if (!ridge) continue
  for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
    if (xx * xx + yy * yy > r * r) continue
    const k = (y + yy) * w + x + xx; if (tq < A[k]) A[k] = tq
  }
}
for (let i = 0; i < w * h; i++) if (ink[i] && A[i] === Infinity) A[i] = T[i]
const TILT = 0.55, LAG = 8
for (let i = 0; i < w * h; i++) if (ink[i] && T[i] < Infinity && A[i] < Infinity) A[i] = Math.max(A[i] + TILT * (T[i] - A[i]), T[i] - LAG)
for (let n = 0; n < 3; n++) {
  const B = A.slice()
  for (let i = w; i < w * h - w; i++) {
    if (!ink[i] || B[i] === Infinity) continue
    let s = B[i], c = 1; for (const k of [i + 1, i - 1, i + w, i - w]) if (ink[k] && B[k] < Infinity) { s += B[k]; c++ }
    A[i] = s / c
  }
}
// pente minimale : pas de point allumé avant ses voisins, pas de zone allumée d'un coup
const SLOPE = 0.6, Am = new Float64Array(w * h).fill(Infinity)
for (const q of seeds) { Am[q] = A[q]; push(q, A[q]) }
while (heap.length) {
  const [t, i] = pop(); if (t > Am[i]) continue
  const x = i % w, y = i / w | 0
  for (const [dx, dy, c] of NB) { const k = (y + dy) * w + x + dx; if (!ink[k] || A[k] === Infinity) continue; const u = Math.max(A[k], t + SLOPE * c); if (u < Am[k]) { Am[k] = u; push(k, u) } }
}
for (let i = 0; i < w * h; i++) if (ink[i] && Am[i] < Infinity) A[i] = Am[i]
for (let n = 0; n < 4; n++) { const B = A.slice(); for (let i = w; i < w * h - w; i++) if (B[i] === Infinity) { let m = Infinity; for (const k of [i + 1, i - 1, i + w, i - w]) m = Math.min(m, B[k]); A[i] = m } }
let AMAX = 0, DMAX = 0; for (let i = 0; i < w * h; i++) if (ink[i]) { AMAX = Math.max(AMAX, A[i]); DMAX = Math.max(DMAX, D[i]) }

const w2 = w / 2 | 0, h2 = h / 2 | 0, rgba = new Uint8ClampedArray(w2 * h2 * 4)
for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
  let s = 0, n = 0
  for (const k of [2 * y * w + 2 * x, 2 * y * w + 2 * x + 1, (2 * y + 1) * w + 2 * x, (2 * y + 1) * w + 2 * x + 1]) if (A[k] !== Infinity) { s += A[k]; n++ }
  const c = y * w2 + x, v = n ? Math.min(65534, Math.round(s / n / AMAX * 65534)) : 65535
  rgba[c * 4] = v >> 8; rgba[c * 4 + 1] = v & 255; rgba[c * 4 + 2] = 0; rgba[c * 4 + 3] = 255
}
const png = await p.evaluate(async ({ px, w, h }) => {
  const c = new OffscreenCanvas(w, h); c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0)
  const bl = await c.convertToBlob({ type: 'image/png' }); return Array.from(new Uint8Array(await bl.arrayBuffer()))
}, { px: Array.from(rgba), w: w2, h: h2 })
await b.close()
writeFileSync(new URL(`../../src/holosene/${mot}-along.png`, import.meta.url), Buffer.from(png))
const r1 = (v) => Math.round(v * 10) / 10
const data = {
  map: { w: w2, h: h2, m: M, k: 0.5 }, amax: r1(AMAX), dmax: r1(DMAX), vb: [VX, VY, W, H],
  // boules dans le vide (d'un morceau au suivant) : départ (x, y, rayon), arrivée, moments (unités de chemin)
  balls: balls.map((o) => ({ from: o.from.map(r1), to: o.to.map(r1), t: o.t.map(r1) })),
}
writeFileSync(new URL(`../../src/holosene/${mot}-trace.js`, import.meta.url),
  `// généré par brand/tools/ink-trace.mjs : apparition tracée de ${mot.toUpperCase()} (carte ${mot}-along.png)\nexport const TRACE = ${JSON.stringify(data)}\n`)
console.log(`${seq.length} morceaux, AMAX ${r1(AMAX)}, DMAX ${r1(DMAX)}, ${balls.length} sauts, ${unreached} px non atteints`)
