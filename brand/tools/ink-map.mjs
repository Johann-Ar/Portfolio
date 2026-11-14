// carte « encre » d'un logotype du pack (public/logotypes/svg/<mot>.svg, tracés exacts), pour son rendu à l'encre en
// WebGL (src/holosene/ink-word.js) : node ink-map.mjs [holosene] → src/holosene/<mot>-ink.png (importé par Vite : adresse correcte quel que soit le dossier de publication)
// Cadre : viewBox du logotype + marge M (unités), RES pixel(s) par unité ; calcul sur une trame K fois plus fine, moyenné.
// R : distance signée au bord, positive dedans : (d + 8) / 48 × 255 (de −8 à +40 unités ; bord net à toute taille)
// G : demi-épaisseur locale du trait (rayon de la plus grande boule inscrite qui contient le point) / TMAX × 255 : règle
//     la densité de l'encre (pleins foncés, déliés clairs)
// B : distance signée lissée (même codage que R) : sa pente donne le sens du trait (fibres du pinceau)
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const mot = process.argv[2] || 'holosene'
const svg = readFileSync(new URL(`../../public/logotypes/svg/${mot}.svg`, import.meta.url), 'utf8')
const VB = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const glass = readFileSync(new URL('../../src/glass.js', import.meta.url), 'utf8')
const edt = glass.slice(glass.indexOf('export function insideDistance')).replace('export ', '')
const M = 40, RES = 1, K = 3, TMAX = 48

const b = await chromium.launch()
const p = await b.newPage()
const out = await p.evaluate(async ({ svg, VB, edt, M, RES, K, TMAX }) => {
  const insideDistance = new Function(`${edt}; return insideDistance`)()
  const W = Math.round((VB[2] + 2 * M) * RES), H = Math.round((VB[3] + 2 * M) * RES), w = W * K, h = H * K
  const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  await img.decode()
  const c = new OffscreenCanvas(w, h), x = c.getContext('2d')
  const s = RES * K
  x.drawImage(img, (M - VB[0]) * s, (M - VB[1]) * s, VB[2] * s, VB[3] * s)
  const a = x.getImageData(0, 0, w, h).data
  const inn = new Uint8Array(w * h), outM = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) { inn[i] = a[i * 4 + 3] > 127; outM[i] = !inn[i] }
  const di = insideDistance(inn, w, h), dout = insideDistance(outM, w, h)
  // distance signée sur la trame fine (unités)
  const sdF = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) sdF[i] = (inn[i] ? di[i] - 0.5 : -(dout[i] - 0.5)) / s
  // demi-épaisseur locale : chaque point de l'axe médian (pente du champ < 0,6) tamponne un disque de son rayon
  const T = new Float32Array(w * h)
  const at = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h ? -99 : sdF[Y * w + X])
  for (let Y = 1; Y < h - 1; Y++) for (let X = 1; X < w - 1; X++) {
    const v = sdF[Y * w + X]; if (v <= 0.5) continue
    const gx = (at(X + 1, Y) - at(X - 1, Y)) * s / 2, gy = (at(X, Y + 1) - at(X, Y - 1)) * s / 2
    if (Math.hypot(gx, gy) > 0.6) continue
    const r = v * s, r2 = r * r, R = Math.ceil(r)
    for (let j = -R; j <= R; j++) { const yy = Y + j; if (yy < 0 || yy >= h) continue
      for (let i = -R; i <= R; i++) { const xx = X + i; if (xx < 0 || xx >= w || i * i + j * j > r2) continue
        const k = yy * w + xx; if (T[k] < v) T[k] = v } }
  }
  for (let i = 0; i < w * h; i++) if (inn[i] && T[i] < sdF[i]) T[i] = sdF[i]
  // moyenne par blocs K × K
  const sd = new Float32Array(W * H), th = new Float32Array(W * H), m = new Float32Array(W * H)
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    let s1 = 0, s2 = 0, n = 0
    for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) { const k = (Y * K + j) * w + X * K + i; s1 += sdF[k]; if (inn[k]) { s2 += T[k]; n++ } }
    sd[Y * W + X] = s1 / (K * K); th[Y * W + X] = n ? s2 / n : 0; m[Y * W + X] = n / (K * K)
  }
  // épaisseur : prolongée un peu hors du trait (bord net quand la carte est interpolée), puis adoucie dans le trait
  const box = (src, wt, r) => {   // moyenne pondérée (wt) en boîte séparable
    const num = new Float32Array(W * H), den = new Float32Array(W * H), t1 = new Float32Array(W * H), t2 = new Float32Array(W * H)
    for (let i = 0; i < W * H; i++) { num[i] = src[i] * wt[i]; den[i] = wt[i] }
    for (const [A, B] of [[num, t1], [den, t2]]) {
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) { let acc = 0; for (let d = -r; d <= r; d++) acc += A[Y * W + Math.min(W - 1, Math.max(0, X + d))]; B[Y * W + X] = acc }
      for (let X = 0; X < W; X++) for (let Y = 0; Y < H; Y++) { let acc = 0; for (let d = -r; d <= r; d++) acc += B[Math.min(H - 1, Math.max(0, Y + d)) * W + X]; A[Y * W + X] = acc }
    }
    return num.map((v, i) => (den[i] > 1e-6 ? v / den[i] : 0))
  }
  const thS = box(th, m, 1), sdB = box(sd, new Float32Array(W * H).fill(1), 3)
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d'), id = cx.createImageData(W, H)
  const enc = (v) => Math.round(Math.min(255, Math.max(0, (v + 8) / 48 * 255)))
  let tmax = 0
  for (let i = 0; i < W * H; i++) {
    tmax = Math.max(tmax, th[i])
    id.data[i * 4] = enc(sd[i]); id.data[i * 4 + 1] = Math.round(Math.min(255, thS[i] / TMAX * 255)); id.data[i * 4 + 2] = enc(sdB[i]); id.data[i * 4 + 3] = 255
  }
  cx.putImageData(id, 0, 0)
  const blob = await cv.convertToBlob({ type: 'image/png' })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return { png: btoa(bin), W, H, tmax }
}, { svg, VB, edt, M, RES, K, TMAX })
await b.close()
const file = new URL(`../../src/holosene/${mot}-ink.png`, import.meta.url)
writeFileSync(file, Buffer.from(out.png, 'base64'))
console.log(`${mot}-ink.png ${out.W} × ${out.H}, demi-épaisseur max ${out.tmax.toFixed(1)} unités (plafond ${TMAX}), viewBox ${VB.join(' ')}, marge ${M}, ${RES} px/unité`)
