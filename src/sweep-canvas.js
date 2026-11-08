/**
 * Balayage du nom de l'accueil (logotype-svg.js) dessiné dans un <canvas> pendant qu'il se fait.
 *
 * Le SVG empile trois copies du nom (très floue, floue, nette) découvertes chacune par un masque en dégradé que main.js
 * modifie à chaque image. Chrome calcule masques et filtres SVG sur la carte graphique ; Safari et Firefox les calculent
 * sur le processeur, en pleine résolution, à chaque image : ~100 ms par image pendant la scène (mesuré dans Safari).
 *
 * Même calcul ici, accéléré partout : les deux copies floues sont rendues une seule fois par le navigateur, avec le même filtre
 * SVG (rendu identique), en blanc ; à chaque image, chaque copie est multipliée par son dégradé (mêmes arrêts, même
 * géométrie que les masques), les deux sont empilées puis teintées à l'encre du thème. Avant et après le balayage
 * (nom invisible, ou entièrement net), c'est le SVG d'origine qui s'affiche. La copie nette reste toujours celle du SVG
 * (vectorielle) : chaque moteur la place sur sa propre grille de pixels, un canvas ne la reproduirait pas au pixel près.
 * Tant que les copies ne sont pas prêtes (ou en cas d'échec), main.js garde le balayage SVG d'origine.
 */
const MAX_PX = 3200   // largeur des copies au plus

const svgToCanvas = (src, w, h) => {
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }))
  const img = new Image(); img.src = url
  return img.decode().then(() => {
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h })
    c.getContext('2d').drawImage(img, 0, 0, w, h)
    return c
  }).finally(() => URL.revokeObjectURL(url))
}

export function sweepCanvas(svg) {
  const holder = svg.parentElement
  const vb = svg.viewBox.baseVal
  const grads = [...svg.querySelectorAll('.bal-g')]
  const g0 = grads[0]
  const gx1 = +g0.getAttribute('x1'), gx2 = +g0.getAttribute('x2')
  const offsets = [...g0.querySelectorAll('stop')].map((s) => +s.getAttribute('offset'))
  const letters = svg.querySelector('[id^="bal-l-"]')
  const filters = [0, 1].map((k) => { const l = svg.querySelector(`.bal-c${k} > g[filter]`); return l && svg.getElementById(l.getAttribute('filter').slice(5, -1)) })

  const cv = document.createElement('canvas')
  cv.className = 'bal-canvas'; cv.setAttribute('aria-hidden', 'true')
  cv.style.cssText = 'position:absolute;pointer-events:none;visibility:hidden'
  holder.style.position ||= 'relative'
  // le canvas (copies floues) passe sous le SVG, qui garde la copie nette : vectorielle, au pixel près dans chaque moteur
  svg.before(cv)
  svg.style.position = 'relative'
  const ctx = cv.getContext('2d')
  const tmp = document.createElement('canvas'), tctx = tmp.getContext('2d')
  const api = { ready: false, shown: false }
  let copies = null, pxW = 0, pxH = 0, color = '#fff', last = null, building = 0

  const readColor = () => { color = getComputedStyle(svg).color; if (api.shown && last) api.draw(last) }
  new MutationObserver(readColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColor)

  // copies : rendues par le navigateur lui-même, avec les filtres d'origine
  const build = () => {
    const r = svg.getBoundingClientRect(), hr = holder.getBoundingClientRect()
    if (!r.width) { api.ready = false; return }
    Object.assign(cv.style, { left: `${r.left - hr.left}px`, top: `${r.top - hr.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    // pixels du canvas calés sur ceux de l'écran (largeur ET hauteur) : aucun rééchantillonnage, pas de décalage sous-pixel
    const k = Math.min(devicePixelRatio || 1, MAX_PX / r.width)
    const w = Math.round(r.width * k), h = Math.round(r.height * k)
    if (w === pxW && h === pxH && copies) return
    pxW = w; pxH = h
    const id = ++building
    const g = letters.cloneNode(true); g.removeAttribute('id')
    for (const n of [g, ...g.querySelectorAll('[fill]')]) if (n.getAttribute('fill') === 'currentColor') n.setAttribute('fill', '#fff')
    const body = new XMLSerializer().serializeToString(g)
    const box = `x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}"`
    const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" width="${w}" height="${h}" preserveAspectRatio="none">`
    const src = (f) => f
      ? `${head}<defs>${new XMLSerializer().serializeToString(Object.assign(f.cloneNode(true), { id: 'f' }))}</defs><g filter="url(#f)"><rect ${box} fill="#000" fill-opacity="0"/>${body}</g></svg>`
      : `${head}${body}</svg>`
    Promise.all([svgToCanvas(src(filters[0]), w, h), svgToCanvas(src(filters[1]), w, h)]).then((c) => {
      if (id !== building) return
      copies = c; cv.width = tmp.width = w; cv.height = tmp.height = h
      readColor(); api.ready = true
      if (last) api.draw(last)
    }).catch(() => { api.ready = false })
  }
  new ResizeObserver(build).observe(svg)

  /** ws[k][i] : opacité de l'arrêt i du dégradé de la copie floue k (0 : très floue, 1 : floue), comme les stop-opacity du SVG. */
  api.draw = (ws) => {
    last = ws
    if (!api.ready) return
    const sx = pxW / vb.width, x1 = (gx1 - vb.x) * sx, x2 = (gx2 - vb.x) * sx
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, pxW, pxH)
    for (let k = 0; k < 2; k++) {
      if (!ws[k].some((v) => v > 0)) continue
      tctx.globalCompositeOperation = 'copy'
      tctx.drawImage(copies[k], 0, 0)
      const gr = tctx.createLinearGradient(x1, 0, x2, 0)
      offsets.forEach((o, i) => gr.addColorStop(o, `rgba(0,0,0,${ws[k][i]})`))
      tctx.globalCompositeOperation = 'destination-in'
      tctx.fillStyle = gr; tctx.fillRect(0, 0, pxW, pxH)
      ctx.drawImage(tmp, 0, 0)
    }
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = color; ctx.fillRect(0, 0, pxW, pxH)
  }
  /** Balayage en cours : copies floues du canvas à la place de celles du SVG ; sinon SVG d'origine seul. */
  api.show = (on) => {
    if (on === api.shown) return
    api.shown = on
    cv.style.visibility = on ? 'visible' : 'hidden'
    svg.classList.toggle('bal-cv', on)
  }
  return api
}
