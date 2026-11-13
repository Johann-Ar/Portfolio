// champ de distance signée du monogramme du logo-kit (design/logo-kit/svg/monogram-iris-dark.svg, tracés exacts du
// Figma, mis à l'échelle de 1000 unités pour sa hauteur), pour le rendu WebGL de l'accueil (contour net à toutes tailles) :
// node sdf.mjs [chromium] → public/media/monogram-sdf.png (944 × 1128 : cadre de 816 × 1000 unités + marge de 64, 1 px par unité ; R : S, V : « o »,
// B : S sur une plage large)
// R, V : valeur = (distance signée en unités + 4) / 32 × 255, positive dedans (précis près du contour).
// B : (distance signée du S + 64) / 128 × 255 : moins précis, mais va jusqu'à 64 unités dehors (renflement du S au survol, gl.js).
// → public/media/monogram-width.png : demi-épaisseur locale du S (unités × 255 / 80), contraste d'épaisseur réglable (gl.js). Calculée sur une trame 4× plus fine (distance
// exacte de Felzenszwalb, dedans et dehors), puis moyennée par blocs de 4 × 4 : les marches de la trame disparaissent.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { LOGO_CONTRAST_BASE } from '../../src/logo-tune.js'

const svg = readFileSync(new URL('../../design/logo-kit/svg/monogram-iris-dark.svg', import.meta.url), 'utf8')
const S_PATH = svg.match(/<path id="S" d="([^"]+)"/)[1], O_PATH = svg.match(/<clipPath id="o-clip"><path d="([^"]+)"/)[1]
const VB = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)   // 146 154 470 576
const glass = readFileSync(new URL('../../src/glass.js', import.meta.url), 'utf8')
const edt = glass.slice(glass.indexOf('export function insideDistance')).replace('export ', '')

const b = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {})
const p = await b.newPage()
const url = await p.evaluate(({ S_PATH, O_PATH, edt, VB, LOGO_CONTRAST_BASE }) => {
  const insideDistance = new Function(`${edt}; return insideDistance`)()
  const K = 4, P = 64, W = 816 + 2 * P, H = 1000 + 2 * P, w = W * K, h = H * K   // cadre du monogramme + marge de 64 unités
  const field = (path, rule) => {
    const c = new OffscreenCanvas(w, h), x = c.getContext('2d')
    const u = 1000 / VB[3]   // 1000 unités pour la hauteur du monogramme
    x.setTransform(K * u, 0, 0, K * u, (P - VB[0] * u) * K, (P - VB[1] * u) * K); x.fill(new Path2D(path), rule)
    const a = x.getImageData(0, 0, w, h).data
    const inn = new Uint8Array(w * h), out = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) { inn[i] = a[i * 4 + 3] > 127; out[i] = !inn[i] }
    const di = insideDistance(inn, w, h), dout = insideDistance(out, w, h)
    const sd = new Float32Array(W * H)
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
      let s = 0
      for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
        const k = (y * K + j) * w + X * K + i
        s += inn[k] ? di[k] - 0.5 : -(dout[k] - 0.5)
      }
      sd[y * W + X] = s / (K * K) / K
    }
    return sd
  }
  const S = field(S_PATH, 'nonzero'), O = field(O_PATH, 'evenodd')
  const c = new OffscreenCanvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H)
  const enc = (v) => Math.round(Math.min(255, Math.max(0, (v + 4) / 32 * 255)))
  const encW = (v) => Math.round(Math.min(255, Math.max(0, (v + 64) / 128 * 255)))
  for (let i = 0; i < W * H; i++) { img.data[i * 4] = enc(S[i]); img.data[i * 4 + 1] = enc(O[i]); img.data[i * 4 + 2] = encW(S[i]); img.data[i * 4 + 3] = 255 }
  x.putImageData(img, 0, 0)

  // demi-épaisseur locale du S (contraste d'épaisseur réglable, gl.js) : axe médian du tracé (là où la distance au bord
  // est la plus grande en travers) ; sa valeur est ensuite reportée le long de l'axe du tracé (plus bas, après alongP)
  const ridge = new Float32Array(W * H).fill(-1), at = (X, Y) => (X < 0 || Y < 0 || X >= W || Y >= H ? -64 : S[Y * W + X])
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const v = S[Y * W + X]; if (v < 1.5) continue
    // axe médian : la pente d'un champ de distance vaut 1 partout, sauf sur l'axe où elle chute (deux bords à égale distance)
    const gx = (at(X + 1, Y) - at(X - 1, Y)) / 2, gy = (at(X, Y + 1) - at(X, Y - 1)) / 2
    if (Math.hypot(gx, gy) < 0.55) ridge[Y * W + X] = v
  }
  const blur = (a, r) => {   // flou en boîte séparable, deux passes
    const t = new Float32Array(W * H)
    for (let pass = 0; pass < 2; pass++) {
      for (let Y = 0; Y < H; Y++) { let acc = 0; for (let X = -r; X <= r; X++) acc += a[Y * W + Math.min(W - 1, Math.max(0, X))]
        for (let X = 0; X < W; X++) { t[Y * W + X] = acc / (2 * r + 1); acc += a[Y * W + Math.min(W - 1, X + r + 1)] - a[Y * W + Math.max(0, X - r)] } }
      for (let X = 0; X < W; X++) { let acc = 0; for (let Y = -r; Y <= r; Y++) acc += t[Math.min(H - 1, Math.max(0, Y)) * W + X]
        for (let Y = 0; Y < H; Y++) { a[Y * W + X] = acc / (2 * r + 1); acc += t[Math.min(H - 1, Y + r + 1) * W + X] - t[Math.max(0, Y - r) * W + X] } }
    }
    return a
  }
  // distance extérieure arrondie : dans les creux du S, le champ exact fait un pli (deux bords à égale distance) et un
  // bord poussé vers l'extérieur (renflement, contraste) y ferait une pointe. Le champ lissé comble ce pli en douceur ;
  // on passe de l'exact (au bord : contour du kit inchangé) au lissé à mesure qu'on s'en éloigne → creux arrondis
  const Sb = blur(Float32Array.from(S), 22)   // ≈ flou gaussien de 18 unités
  // minimum adouci (k unités, proportionnel à la distance : presque rien près du bord) : pas d'arête là où le plafond
  // prend le relais du champ arrondi
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4 }
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
  // distance géodésique dans le S depuis son extrémité du haut (tranches de l'axe, plus bas)
  // distance géodésique dans le S (chanfrein 3-4, balayages aller-retour répétés jusqu'à stabilité : léger et sûr)
  const geo = (seed) => {
    const D = new Float32Array(W * H).fill(1e9); D[seed] = 0
    const F = [[-1, 0, 1], [-1, -1, Math.SQRT2], [0, -1, 1], [1, -1, Math.SQRT2]], B = F.map(([dx, dy, c]) => [-dx, -dy, c])
    for (let it = 0, ch = 1; ch && it < 200; it++) {
      ch = 0
      for (const [list, fwd] of [[F, true], [B, false]]) {
        for (let n = 0; n < W * H; n++) {
          const i = fwd ? n : W * H - 1 - n; if (S[i] <= 0) continue
          const X = i % W, Y = (i / W) | 0; let d = D[i]
          for (const [dx, dy, c] of list) { const nx = X + dx, ny = Y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const v = D[ny * W + nx] + c; if (v < d) d = v }
          if (d < D[i] - 1e-4) { D[i] = d; ch = 1 }
        }
      }
    }
    for (let i = 0; i < W * H; i++) if (S[i] <= 0) D[i] = Infinity
    return D
  }
  const far = (D) => { let m = -1, k = 0; for (let i = 0; i < W * H; i++) if (D[i] < Infinity && D[i] > m) { m = D[i]; k = i } return k }
  let any = 0; for (let i = 0; i < W * H; i++) if (S[i] > 30) { any = i; break }
  const endA = far(geo(any)), DA = geo(endA), endB = far(DA)
  const top = ((endA / W) | 0) <= ((endB / W) | 0) ? endA : endB, Dt = top === endA ? DA : geo(endB)
  const len = Dt[top === endA ? endB : endA]
  // axe du tracé, de haut en bas (boule automatique, gl.js) : pour chaque tranche de la position le long du tracé, le
  // barycentre des points les plus centraux (pondéré par la distance au bord, à la puissance 4)
  const NP = 120, ax = new Float64Array(NP * 3)
  for (let i = 0; i < W * H; i++) if (S[i] > 0 && Dt[i] < Infinity) {
    const k = Math.min(NP - 1, Math.floor(Dt[i] / len * NP)), wgt = S[i] ** 4
    ax[k * 3] += (i % W) * wgt; ax[k * 3 + 1] += ((i / W) | 0) * wgt; ax[k * 3 + 2] += wgt
  }
  let axp = []; for (let k = 0; k < NP; k++) if (ax[k * 3 + 2] > 0) axp.push([ax[k * 3] / ax[k * 3 + 2], ax[k * 3 + 1] / ax[k * 3 + 2]])
  // axe lissé (moyenne glissante, extrémités gardées) puis affiné (Chaikin) : courbe régulière, sans à-coups
  for (let it = 0; it < 3; it++) axp = axp.map((q, i) => i === 0 || i === axp.length - 1 ? q : [0, 1].map((c) => (axp[i - 1][c] + 2 * q[c] + axp[i + 1][c]) / 4))
  for (let it = 0; it < 2; it++) { const o = [axp[0]]; for (let i = 0; i < axp.length - 1; i++) { const a0 = axp[i], b0 = axp[i + 1]; o.push([0.75 * a0[0] + 0.25 * b0[0], 0.75 * a0[1] + 0.25 * b0[1]], [0.25 * a0[0] + 0.75 * b0[0], 0.25 * a0[1] + 0.75 * b0[1]]) } o.push(axp[axp.length - 1]); axp = o }
  const pathPts = axp.filter((q, i) => i % 4 === 0 || i === axp.length - 1).map(([x, y]) => [+(x - P).toFixed(1), +(y - P).toFixed(1)])
  // position le long du tracé pour l'apparition du S (monogram-along.png) : projection de chaque point sur l'axe exporté
  // (pathPts : même courbe et même longueur que gl.js), en fraction de sa longueur ; au-delà des extrémités, le
  // prolongement des segments du bout (valeurs < 0 ou > 1 : les bouts ronds du S se dessinent eux aussi). Lignes de
  // niveau perpendiculaires au trait : le front coupe le S droit, son bout arrondi reste régulier
  const PL = pathPts.map(([x, y]) => [x + P, y + P]), SL = [0]
  for (let i = 1; i < PL.length; i++) SL.push(SL[i - 1] + Math.hypot(PL[i][0] - PL[i - 1][0], PL[i][1] - PL[i - 1][1]))
  const LT = SL[SL.length - 1], alongP = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = 1e18, bs = 0
    for (let i = 0; i < PL.length - 1; i++) {
      const [x0, y0] = PL[i], dx = PL[i + 1][0] - x0, dy = PL[i + 1][1] - y0, l2 = dx * dx + dy * dy || 1
      let t = ((x - x0) * dx + (y - y0) * dy) / l2
      if (!(i === 0 && t < 0) && !(i === PL.length - 2 && t > 1)) t = Math.min(1, Math.max(0, t))
      const ex = x0 + dx * t - x, ey = y0 + dy * t - y, d2 = ex * ex + ey * ey
      if (d2 < best) { best = d2; bs = SL[i] + t * (SL[i + 1] - SL[i]) }
    }
    alongP[y * W + x] = bs / LT
  }
  // lissage limité au S (moyenne pondérée par l'intérieur du tracé) : efface les petits sauts de la projection dans les
  // virages serrés sans mêler deux traits voisins
  { const m = new Float32Array(W * H), num = new Float32Array(W * H)
    for (let i = 0; i < W * H; i++) { m[i] = S[i] > -2 ? 1 : 0; num[i] = alongP[i] * m[i] }
    blur(m, 7); blur(num, 7)
    for (let i = 0; i < W * H; i++) if (m[i] > 0.05) alongP[i] = num[i] / m[i] }

  // demi-épaisseur de chaque point : celle de l'axe médian à la même position le long du tracé (alongP). Une seule valeur
  // en travers du trait : ses deux bords bougent ensemble au contraste (une propagation au plus proche, en ligne et en
  // colonne, donnait des bandes droites et des cassures dans le trait, d'où un bord gonflé et l'autre creusé).
  // Profil moyenné par tranches, lissé le long du tracé (gaussienne de 20 unités) : pas de mélange entre traits voisins
  const NB = Math.ceil(LT / 2), pf = new Float64Array(NB), pn = new Float64Array(NB)
  for (let i = 0; i < W * H; i++) if (ridge[i] > 0) { const k = Math.min(NB - 1, Math.max(0, Math.floor(alongP[i] * NB))); pf[k] += ridge[i]; pn[k]++ }
  const known = []; for (let k = 0; k < NB; k++) if (pn[k]) { pf[k] /= pn[k]; known.push(k) }
  for (let k = 0, q = 0; k < NB; k++) if (!pn[k]) {   // tranches sans crête : interpolées (bouts : valeur du dernier point)
    while (q < known.length - 1 && known[q + 1] < k) q++
    const a = known[q], b = known[Math.min(known.length - 1, q + 1)]
    pf[k] = k <= a ? pf[a] : k >= b ? pf[b] : pf[a] + (pf[b] - pf[a]) * (k - a) / (b - a)
  }
  const sg = 20 / (LT / NB), prof = new Float64Array(NB)
  for (let k = 0; k < NB; k++) { let s = 0, ws = 0; for (let d = -Math.ceil(3 * sg); d <= Math.ceil(3 * sg); d++) { const w = Math.exp(-d * d / (2 * sg * sg)); s += pf[Math.min(NB - 1, Math.max(0, k + d))] * w; ws += w } prof[k] = s / ws }
  const hw = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) { const f = Math.min(NB - 1, Math.max(0, alongP[i] * NB - 0.5)), k = f | 0; hw[i] = prof[k] + (prof[Math.min(NB - 1, k + 1)] - prof[k]) * (f - k) }
  // puis lissage limité au dedans du S (moyenne pondérée, rayon ~20 unités), appliqué dedans et dehors près du bord :
  // côté intérieur d'un virage serré, les perpendiculaires à l'axe convergent et l'épaisseur y changerait d'un coup (le
  // bord poussé ferait un angle) ; dehors, la projection sur l'axe saute d'une branche à l'autre (le bord ferait une bosse)
  { const m = new Float32Array(W * H), num = new Float32Array(W * H)
    for (let i = 0; i < W * H; i++) { m[i] = S[i] > 0 ? 1 : 0; num[i] = hw[i] * m[i] }
    blur(m, 12); blur(num, 12)
    for (let i = 0; i < W * H; i++) if (m[i] > 0.002) hw[i] = num[i] / m[i] }
  // creux du S (pli du champ extérieur comblé, plus bas : pente jusqu'à 0,35 au lieu de 1) : un bord épaissi y serait
  // poussé jusqu'à 3 fois plus loin qu'ailleurs, d'où un croissant et un angle là où l'épaississement s'arrête. Le surplus
  // de demi-épaisseur y est réduit d'autant (pente du champ extérieur au ras du bord, moyennée), l'épaississement
  // réel reste celui voulu
  { let r0 = 0, n0 = 0; for (let i = 0; i < W * H; i++) if (S[i] > 0) { r0 += hw[i]; n0++ } r0 /= n0
    const m = new Float32Array(W * H), num = new Float32Array(W * H)
    for (let i = 0; i < W * H; i++) if (S[i] < -1 && S[i] > -6) { const e = smin(S[i] * 0.35, Math.max(S[i], Sb[i]), Math.max(0.3, -S[i] * 0.3)); m[i] = 1; num[i] = e / S[i] }
    blur(m, 6); blur(num, 6)
    for (let i = 0; i < W * H; i++) if (hw[i] > r0 && m[i] > 0.01) hw[i] = r0 + (hw[i] - r0) * Math.min(1, num[i] / m[i]) }

  const cw = new OffscreenCanvas(W, H), xw = cw.getContext('2d'), iw = xw.createImageData(W, H)
  for (let i = 0; i < W * H; i++) { const v = Math.round(Math.min(255, Math.max(0, hw[i] / 80 * 255))); iw.data[i * 4] = v; iw.data[i * 4 + 3] = 255   // B : inutilisé (0)
    // G : distance au S côté extérieur, arrondie dans les creux (0 à 64 unités, codée en racine carrée), plus fine que le
    // canal B de la carte de distance (0,5 unité) : contour net et creux arrondis quand le contraste d'épaisseur ou le
    // renflement pousse le bord vers l'extérieur
    // plafonné à 35 % de la distance exacte : le comblement ne rejoint jamais le bord (sinon îlots détachés au renflement)
    const e = S[i] < 0 ? smin(S[i] * 0.35, Math.max(S[i], Sb[i]), Math.max(0.3, -S[i] * 0.3)) : 0
    iw.data[i * 4 + 1] = Math.round(Math.min(255, Math.sqrt(Math.max(0, -e / 64)) * 255)) }   // codage en racine : niveaux serrés près du bord (0,06 unité à 1 unité du bord), là où se dessine le contour poussé
  xw.putImageData(iw, 0, 0)
  // position le long du tracé (projection sur l'axe, de −0,1 à 1,1) en 16 bits (R : octet fort, V : octet faible ; l'interpolation bilinéaire reste exacte) :
  // front de l'apparition du S net et régulier (8 bits : paliers de ~6 unités, bout du trait cabossé)
  const ca = new OffscreenCanvas(W, H), xa = ca.getContext('2d'), ia = xa.createImageData(W, H)
  for (let i = 0; i < W * H; i++) { const v = Math.round(Math.min(1, Math.max(0, (alongP[i] + 0.1) / 1.2)) * 65535); ia.data[i * 4] = v >> 8; ia.data[i * 4 + 1] = v & 255; ia.data[i * 4 + 3] = 255 }   // −0,1 à 1,1
  xa.putImageData(ia, 0, 0)

  // S des petits logos (barre du haut, fiches, relais du grand logo) à l'épaisseur de base du site (LOGO_CONTRAST_BASE,
  // la même que le grand logo, gl.js) : même calcul que le shader, sur les champs exacts, en haute définition (2 × le
  // cadre du kit). Seul le S change ; le « o » reste le vectoriel du kit (monogrammes écrits plus bas)
  let ref = 0, nIn = 0
  for (let i = 0; i < W * H; i++) if (S[i] > 0) { ref += hw[i]; nIn++ }
  ref /= nIn
  const ext = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) ext[i] = S[i] < 0 ? smin(S[i] * 0.35, Math.max(S[i], Sb[i]), Math.max(0.3, -S[i] * 0.3)) : 0
  const bil = (a, x, y) => {
    x = Math.min(W - 1.001, Math.max(0, x)); y = Math.min(H - 1.001, Math.max(0, y))
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0
    return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + W] * (1 - fx) + a[i + W + 1] * fx) * fy
  }
  const OW = 940, OH = 1152, os = OW / 816, sMono = (ink) => {
    const cs = new OffscreenCanvas(OW, OH), xs = cs.getContext('2d'), is = xs.createImageData(OW, OH)
    const rgb = ink.match(/\w\w/g).map((h) => parseInt(h, 16))
    for (let Y = 0; Y < OH; Y++) for (let X = 0; X < OW; X++) {
      const ux = (X + 0.5) / os - 0.5 + P, uy = (Y + 0.5) / os - 0.5 + P
      const d = bil(S, ux, uy), e = bil(ext, ux, uy)
      const f = (d >= 0 ? d : e) + (LOGO_CONTRAST_BASE - 1) * (bil(hw, ux, uy) - ref)
      const a = Math.min(1, Math.max(0, f * os + 0.5)), k = (Y * OW + X) * 4
      is.data[k] = rgb[0]; is.data[k + 1] = rgb[1]; is.data[k + 2] = rgb[2]; is.data[k + 3] = Math.round(a * 255)
    }
    xs.putImageData(is, 0, 0); return cs
  }
  const toUrl = (cv) => cv.convertToBlob({ type: 'image/png' }).then((bl) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(bl) }))
  return Promise.all([toUrl(c), toUrl(cw), toUrl(sMono('FFFFFF')), toUrl(sMono('1E1E1E')), pathPts, toUrl(ca)])
}, { S_PATH, O_PATH, edt, VB, LOGO_CONTRAST_BASE })
await b.close()
writeFileSync(new URL('../../public/media/monogram-sdf.png', import.meta.url), Buffer.from(url[0].split(',')[1], 'base64'))
writeFileSync(new URL('../../public/media/monogram-width.png', import.meta.url), Buffer.from(url[1].split(',')[1], 'base64'))
writeFileSync(new URL('../../public/media/monogram-along.png', import.meta.url), Buffer.from(url[5].split(',')[1], 'base64'))
// axe du S (unités du monogramme, de haut en bas) : trajet de la boule automatique (gl.js)
writeFileSync(new URL('../../src/monogram-path.js', import.meta.url), `// généré par brand/tools/sdf.mjs : axe du S du logo (unités du monogramme, 816 × 1000), de son extrémité du haut à celle du bas\nexport const S_AXIS = ${JSON.stringify(url[4])}\n`)
// monogrammes des petits logos : SVG du kit, S remplacé par son image à l'épaisseur de base (le « o » ne change pas)
for (const [mode, k] of [['dark', 2], ['light', 3]]) {
  const kit = readFileSync(new URL(`../../design/logo-kit/svg/monogram-iris-${mode}.svg`, import.meta.url), 'utf8')
  const out = kit.replace(/<path id="S" d="[^"]+" fill="[^"]+"\/>/, `<image id="S" href="${url[k]}" x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${VB[3]}" preserveAspectRatio="none"/>`)
  if (out === kit) throw new Error('S introuvable dans monogram-iris-' + mode + '.svg')
  writeFileSync(new URL(`../../public/media/monogram-${mode}-base.svg`, import.meta.url), out)
}
console.log('public/media/monogram-sdf.png, public/media/monogram-width.png, public/media/monogram-along.png, public/media/monogram-{dark,light}-base.svg')
