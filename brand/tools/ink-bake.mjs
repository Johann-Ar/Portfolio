// Encre de Chine précalculée sur un logotype du pack (src/holosene/ink-word.js) : simulation physique simplifiée de
// l'encre dans le papier, dans l'esprit de Curtis et al. 1997 (« Computer-Generated Watercolor ») et de MoXi (Chu et Tai
// 2005, diffusion de l'encre dans un papier absorbant).
// node ink-bake.mjs [holosene] → src/holosene/<mot>-bake.webp (densité finale de l'encre, 0 à 1)
//
// Rien n'est redessiné : l'encre est déposée dans le tracé exact du pack (tramé à S px par unité), plus chargée dans les
// pleins (épaisseur lue dans <mot>-ink.png, brand/tools/ink-map.mjs). Puis :
// 1. Papier : réseau de fibres tirées au hasard (courbes fines, un peu plus souvent horizontales) + nuages de la pâte
//    (formation du papier) ⇒ perméabilité locale.
// 2. Pinceau : la charge varie le long du trait ; dans les déliés, le pinceau se vide (stries parallèles au trait).
// 3. Diffusion : l'eau coule des zones mouillées vers les moins mouillées, plus vite le long des fibres ; elle n'entre
//    dans le papier sec que par les fibres (bord fibreux). Le carbone suit l'eau, freiné par les fibres. L'eau s'évapore
//    d'une quantité fixe : les bords sèchent d'abord, l'eau du cœur vient les remplacer et y dépose son carbone (bord
//    plus foncé, « effet tache de café »).
// 4. Densité : loi de Beer-Lambert sur le carbone déposé, plus dense sur les fibres.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const mot = process.argv[2] || 'holosene'
const svg = readFileSync(new URL(`../../public/logotypes/svg/${mot}.svg`, import.meta.url), 'utf8').replace(/currentColor/g, '#000')
const inkPng = readFileSync(new URL(`../../src/holosene/${mot}-ink.png`, import.meta.url)).toString('base64')
const VB = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const P = { S: 1.5, M: 40, SEED: 7, ITER: 150 }

const b = await chromium.launch()
const pg = await b.newPage()
pg.on('console', (m) => console.log(m.text()))
const out = await pg.evaluate(async ({ svg, inkPng, VB, P }) => {
  const { S, M } = P
  const W = Math.round((VB[2] + 2 * M) * S), H = Math.round((VB[3] + 2 * M) * S), N = W * H
  let seed = P.SEED; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  // bruit de valeur (unités du dessin)
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263 + P.SEED * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y); let fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    return (hash(i, j) * (1 - fx) + hash(i + 1, j) * fx) * (1 - fy) + (hash(i, j + 1) * (1 - fx) + hash(i + 1, j + 1) * fx) * fy }
  const fbm = (x, y) => { let s = 0, a = 0.5; for (let k = 0; k < 4; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 3.3; a *= 0.5 } return s / 0.9375 }
  // tracé : couverture (trame 4 × 4 par case)
  const img = new Image(); img.src = 'data:image/svg+xml,' + encodeURIComponent(svg); await img.decode()
  const K = 4, c = new OffscreenCanvas(W * K, H * K), x = c.getContext('2d')
  x.drawImage(img, (M - VB[0]) * S * K, (M - VB[1]) * S * K, VB[2] * S * K, VB[3] * S * K)
  const a = x.getImageData(0, 0, W * K, H * K).data, cov = new Float32Array(N)
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) { let s = 0; for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) s += a[((Y * K + j) * W * K + X * K + i) * 4 + 3]; cov[Y * W + X] = s / (K * K * 255) }
  // carte d'épaisseur (1 px par unité, même marge)
  const im2 = new Image(); im2.src = 'data:image/png;base64,' + inkPng; await im2.decode()
  const c2 = new OffscreenCanvas(im2.width, im2.height), x2 = c2.getContext('2d'); x2.drawImage(im2, 0, 0)
  const md = x2.getImageData(0, 0, im2.width, im2.height).data, mw = im2.width, mh = im2.height
  const samp = (u, v, ch) => { const X = u + M - 0.5, Y = v + M - 0.5, i = Math.max(0, Math.min(mw - 2, Math.floor(X))), j = Math.max(0, Math.min(mh - 2, Math.floor(Y))), fx = Math.min(1, Math.max(0, X - i)), fy = Math.min(1, Math.max(0, Y - j))
    const g = (ii, jj) => md[(jj * mw + ii) * 4 + ch] / 255; return (g(i, j) * (1 - fx) + g(i + 1, j) * fx) * (1 - fy) + (g(i, j + 1) * (1 - fx) + g(i + 1, j + 1) * fx) * fy }
  const U = (X) => (X + 0.5) / S - M

  // 1. papier : fibres
  const F = new Float32Array(N)
  const nF = Math.round(VB[2] * VB[3] / 9)
  for (let f = 0; f < nF; f++) {
    let px = (rnd() * (VB[2] + 2 * M)) - M, py = (rnd() * (VB[3] + 2 * M)) - M
    let th = (rnd() - 0.5) * Math.PI * (rnd() < 0.6 ? 0.5 : 2), L = 8 + rnd() * rnd() * 70, wgt = 0.35 + rnd() * 0.65, curl = (rnd() - 0.5) * 0.08
    for (let s = 0; s < L; s += 0.5) {
      const X = (px + M) * S, Y = (py + M) * S, i = Math.floor(X), j = Math.floor(Y)
      if (i >= 0 && j >= 0 && i < W - 1 && j < H - 1) { const fx = X - i, fy = Y - j
        F[j * W + i] += wgt * (1 - fx) * (1 - fy); F[j * W + i + 1] += wgt * fx * (1 - fy); F[(j + 1) * W + i] += wgt * (1 - fx) * fy; F[(j + 1) * W + i + 1] += wgt * fx * fy }
      th += curl + (rnd() - 0.5) * 0.12; px += Math.cos(th) * 0.5; py += Math.sin(th) * 0.5
    }
  }
  let mean = 0; for (let i = 0; i < N; i++) mean += F[i]; mean /= N
  const A = new Float32Array(N), Fn = new Float32Array(N)
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X, u = U(X), v = U(Y)
    Fn[i] = Math.min(2.5, F[i] / mean)
    const floc = fbm(u * 0.04, v * 0.04)                       // nuages de la pâte
    A[i] = Math.min(1, Math.max(0.05, 0.18 + 0.32 * Math.min(1.6, Fn[i]) + 0.35 * floc))
  }
  // 2. pinceau : charge d'encre
  const Wt = new Float32Array(N), Pg = new Float32Array(N), Dep = new Float32Array(N)
  const band = []
  for (let Y = 1; Y < H - 1; Y++) for (let X = 1; X < W - 1; X++) {
    const i = Y * W + X, u = U(X), v = U(Y)
    const sd = samp(u, v, 0) * 48 - 8
    if (sd > -7) band.push(i)
    if (cov[i] <= 0) continue
    const T = Math.max(0.5, samp(u, v, 1) * 48), thick = Math.min(1, Math.max(0, (T / 21 - 0.15) / 0.65))
    const acr = Math.min(1, Math.max(0, sd / T))
    let load = (0.72 + 0.28 * thick) * (0.82 + 0.36 * fbm(u * 0.012 + 3, v * 0.012))
    // pinceau qui se vide dans les déliés : stries parallèles au trait (lignes d'égale distance au bord), interrompues
    const run = fbm(u * 0.02 + 9, v * 0.02)
    const streak = vn(acr * 6 + 1.7 * fbm(u * 0.01, v * 0.01), 3.7 + run * 1.6)
    const lift = Math.min(1, Math.max(0, (fbm(u * 0.03 + acr * 2, v * 0.03) - 0.42) / 0.25))
    const sm = (e0, e1, t) => { t = Math.min(1, Math.max(0, (t - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
    const dry = sm(0.5, 0.66, streak) * lift * (1 - thick) * (0.3 + 0.7 * sm(0, 0.3, acr))
    load *= 1 - 0.85 * dry
    Wt[i] = cov[i] * (0.55 + 0.45 * load); Pg[i] = cov[i] * load
  }
  // 3. diffusion de l'eau et du carbone, évaporation, dépôt
  const dW = new Float32Array(N), dP = new Float32Array(N), NB = [1, -1, W, -W]
  const KF = 0.16, WET = 0.03, EV = 0.0055, CARRY = 0.8
  for (let it = 0; it < P.ITER; it++) {
    for (const i of band) {
      const w = Wt[i]; if (w <= WET) continue
      const conc = Pg[i] / w
      for (const d of NB) {
        const n = i + d, wn = Wt[n]; if (wn >= w) continue
        // papier sec : l'eau n'y entre que par les fibres
        const gate = wn > WET ? 1 : Math.max(0, (A[n] - 0.5) / 0.3)
        if (gate <= 0) continue
        const fl = KF * Math.min(A[i], A[n]) * (w - wn) * gate
        dW[i] -= fl; dW[n] += fl
        const pf = fl * conc * CARRY * (1.15 - 0.3 * Math.min(1.5, Fn[n]))   // les fibres retiennent le carbone
        dP[i] -= pf; dP[n] += pf
      }
    }
    for (const i of band) {
      if (dW[i] || dP[i]) { Wt[i] += dW[i]; Pg[i] += dP[i]; dW[i] = 0; dP[i] = 0 }
      const w = Wt[i]; if (w <= 0) continue
      // bord mouillé (une case voisine sèche) : il s'évapore 3 fois plus vite, l'eau du cœur vient le remplacer
      const rim = Wt[i + 1] <= WET || Wt[i - 1] <= WET || Wt[i + W] <= WET || Wt[i - W] <= WET ? 3 : 1
      const e = Math.min(w, EV * rim * (0.7 + 0.6 * A[i])), f = e / w   // part évaporée ⇒ part du carbone déposé
      Dep[i] += Pg[i] * f; Pg[i] -= Pg[i] * f; Wt[i] = w - e
    }
  }
  for (const i of band) Dep[i] += Pg[i]
  // 4. densité (Beer-Lambert), plus dense sur les fibres
  const D = new Float32Array(N)
  let mx = 0
  for (let i = 0; i < N; i++) { D[i] = cov[i] > 0 ? 1 - Math.exp(-Dep[i] * 2.6 * (0.95 + 0.05 * Math.min(2, Fn[i]))) : -1; mx = Math.max(mx, D[i]) }
  // le bord net vient du tracé vectoriel (ink-word.js) : hors des lettres, la carte reprend la valeur voisine (3 cases),
  // pour que la lecture interpolée au bord ne fonce pas
  for (let n = 0; n < 3; n++) { const B = D.slice(); for (let i = W; i < N - W; i++) if (B[i] < 0) { let m = -1; for (const k of [i + 1, i - 1, i + W, i - W]) m = Math.max(m, B[k]); D[i] = m } }
  const out = new Uint8ClampedArray(N * 4)
  for (let i = 0; i < N; i++) {
    const v = Math.round(Math.max(0, Math.min(1, D[i] / 0.96)) * 255)
    out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255
  }
  const cv = new OffscreenCanvas(W, H); cv.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0)
  const toB64 = async (type, quality) => { const bl = await cv.convertToBlob({ type, quality }); const buf = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return s }
  return { webp: btoa(await toB64('image/webp', 0.9)), png: btoa(await toB64('image/png')), W, H, mx, band: band.length }
}, { svg, inkPng, VB, P })
await b.close()
writeFileSync(new URL(`../../src/holosene/${mot}-bake.webp`, import.meta.url), Buffer.from(out.webp, 'base64'))
if (process.argv[3]) writeFileSync(process.argv[3], Buffer.from(out.png, 'base64'))
console.log(`${mot}-bake.webp ${out.W} × ${out.H}, ${Math.round(Buffer.from(out.webp, 'base64').length / 1024)} Ko, densité max ${out.mx.toFixed(3)}, ${out.band} cases simulées, ${P.S} px/unité`)
