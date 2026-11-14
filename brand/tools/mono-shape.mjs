// Forme du gros logo de l'accueil (S·o avec son contraste d'épaisseur) pour son rendu à l'encre sur holosene.fr
// (src/holosene/ink-word.js) : node mono-shape.mjs → src/holosene/monogram-shape.svg
//
// Rien n'est redessiné : la forme est calculée exactement comme dans le shader de l'accueil (src/gl.js, halftoneS) à
// partir des cartes du kit (public/media/monogram-sdf.png et monogram-width.png, brand/tools/sdf.mjs) : contour du S
// déplacé de (contraste − 1) × (demi-épaisseur locale − demi-épaisseur moyenne), contraste LOGO_CONTRAST_BASE ; « o »
// tel quel. Le résultat est une image blanche (alpha anticrénelé) dans un SVG dont le viewBox est en unités « encre »
// (F unité par unité du monogramme de 1000 de haut ; data-frame : coin du cadre en unités du monogramme, F ; tracé : mono-trace.mjs) : les outils ink-map / ink-trace / ink-bake la lisent comme un
// logotype du pack.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

// contraste d'épaisseur de holosene.fr : plus marqué que celui de l'accueil (LOGO_CONTRAST_BASE), choix de Johann
const CONTRAST = 1.6
const F = 0.2, R = 6, PAD = 6   // unités « encre » par unité du monogramme, px par unité « encre », marge (unités du monogramme)
const b64 = (f) => 'data:image/png;base64,' + readFileSync(new URL(`../../public/media/${f}`, import.meta.url)).toString('base64')

const b = await chromium.launch()
const p = await b.newPage()
const out = await p.evaluate(async ({ sdf, wid, K, F, R, PAD }) => {
  const SW = 944, SH = 1128, SP = 64
  const read = async (src) => {
    const im = new Image(); im.src = src; await im.decode()
    const c = new OffscreenCanvas(SW, SH), x = c.getContext('2d', { colorSpace: 'srgb' }); x.drawImage(im, 0, 0)
    return x.getImageData(0, 0, SW, SH).data
  }
  const D = await read(sdf), Wd = await read(wid)
  // demi-épaisseur moyenne du S (comme gl.js : pixels où le champ large B est dedans)
  let n = 0, sum = 0; for (let i = 0; i < SW * SH; i++) if (D[i * 4 + 2] > 127.5) { n++; sum += Wd[i * 4] * 80 / 255 }
  const ref = sum / n
  // lecture bilinéaire (comme texture2D) d'un canal, en unités du monogramme (lp)
  const tex = (A, ch, x, y) => {
    const fx = x + SP - 0.5, fy = y + SP - 0.5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j
    const g = (X, Y) => A[(Math.min(SH - 1, Math.max(0, Y)) * SW + Math.min(SW - 1, Math.max(0, X))) * 4 + ch] / 255
    return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v
  }
  const sd = (x, y) => {   // distance signée au bord (unités du monogramme, positive dedans) : src/gl.js, halftoneS
    if (x < -64 || y < -64 || x > 880 || y > 1064) return -64
    let sS = tex(D, 0, x, y) * 32 - 4
    const sO = tex(D, 1, x, y) * 32 - 4, wr = tex(Wd, 0, x, y), wg = tex(Wd, 1, x, y), bb = tex(D, 2, x, y)
    const shift = (K - 1) * (wr * 80 - ref)
    if (Math.abs(shift) > 0.02) {
      let f
      if (sS > 20) { const t = Math.min(1, Math.max(0, (sS - 20) / 7.5)); f = sS + (bb * 128 - 64 - sS) * t * t * (3 - 2 * t) }
      else if (wg < 0.995) f = sS >= 0 ? sS : -wg * wg * 64
      else f = sS > -3.9 ? sS : bb * 128 - 64
      sS = f + shift
    }
    const s = Math.max(sS, sO)
    return s < -3.9 ? -64 : s
  }
  // cadre : boîte de la forme + marge
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (let y = -64; y <= 1064; y++) for (let x = -64; x <= 880; x++) if (sd(x, y) > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  x0 = Math.floor(x0 - PAD); y0 = Math.floor(y0 - PAD); x1 = Math.ceil(x1 + PAD); y1 = Math.ceil(y1 + PAD)
  const vw = Math.ceil((x1 - x0) * F), vh = Math.ceil((y1 - y0) * F), w = vw * R, h = vh * R   // cadre en unités « encre » entières (les outils travaillent à 1 px par unité)
  const pu = R * F   // px par unité du monogramme
  const c = new OffscreenCanvas(w, h), x = c.getContext('2d'), id = x.createImageData(w, h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const a = Math.min(1, Math.max(0, sd(x0 + (i + 0.5) / pu, y0 + (j + 0.5) / pu) * pu + 0.5))
    const k = (j * w + i) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = 255; id.data[k + 3] = Math.round(a * 255)
  }
  x.putImageData(id, 0, 0)
  const buf = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return { png: btoa(bin), vw, vh, w, h, x0, y0, ref }
}, { sdf: b64('monogram-sdf.png'), wid: b64('monogram-width.png'), K: CONTRAST, F, R, PAD })
await b.close()
const r2 = (v) => Math.round(v * 100) / 100
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${r2(out.vw)} ${r2(out.vh)}" data-frame="${out.x0} ${out.y0} ${F}">` +
  `<!-- généré par brand/tools/mono-shape.mjs : gros logo de l'accueil (contraste ${CONTRAST}), cadre (${out.x0}, ${out.y0}) unités du monogramme × ${F} -->` +
  `<g class="mot"><image width="${r2(out.vw)}" height="${r2(out.vh)}" preserveAspectRatio="none" href="data:image/png;base64,${out.png}" xlink:href="data:image/png;base64,${out.png}"/></g></svg>\n`
writeFileSync(new URL('../../src/holosene/monogram-shape.svg', import.meta.url), svg)
console.log(`monogram-shape.svg ${r2(out.vw)} × ${r2(out.vh)} unités (${out.w} × ${out.h} px), demi-épaisseur moyenne ${out.ref.toFixed(1)}`)
