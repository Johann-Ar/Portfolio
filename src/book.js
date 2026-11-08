/**
 * Livre PDF feuilletable (fiche Mondes Immergés) : StPageFlip (page-flip, MIT) pour le feuilletage avec courbure de
 * page et glisser au doigt, PDF.js (pdfjs-dist, Apache-2.0) pour lire le PDF. Tout est chargé à l'approche du livre
 * (import dynamique) ; les pages sont dessinées au fur et à mesure, d'abord autour de la page ouverte.
 */
async function mount(fig) {
  if (fig.dataset.state) return
  fig.dataset.state = 'loading'
  const el = fig.querySelector('.book__mount'), bar = fig.querySelector('.book__bar i')
  const progress = (k) => { if (bar) bar.style.width = Math.round(k * 100) + '%' }
  try {
    const [{ PageFlip }, pdfjs, { default: workerUrl }] = await Promise.all([
      import('page-flip'), import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    progress(0.15)
    const task = pdfjs.getDocument({ url: fig.dataset.book })
    task.onProgress = ({ loaded, total }) => total && progress(0.15 + 0.6 * loaded / total)
    const pdf = await task.promise
    const first = await pdf.getPage(1), vp0 = first.getViewport({ scale: 1 })

    // taille d'une page : la double page tient dans le cadre (marges comprises)
    const box = { width: fig.offsetWidth, height: fig.offsetHeight }   // sans les transformations de l'animation d'ouverture
    const ratio = vp0.width / vp0.height
    const h = Math.floor(Math.min(box.height * 0.88, (box.width * 0.92) / 2 / ratio)), w = Math.floor(h * ratio)
    const dpr = Math.min(devicePixelRatio || 1, 2)

    const pages = [], canvases = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = document.createElement('div'); p.className = 'book__page'
      if (i === 1 || i === pdf.numPages) p.dataset.density = 'hard'   // couvertures rigides
      const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr
      p.append(c); pages.push(p); canvases.push(c)
    }
    const drawn = new Set()
    const draw = async (i) => {   // i : index 0..n-1
      if (i < 0 || i >= pdf.numPages || drawn.has(i)) return
      drawn.add(i)
      const page = i === 0 ? first : await pdf.getPage(i + 1)
      const vp = page.getViewport({ scale: (w * dpr) / vp0.width })
      await page.render({ canvasContext: canvases[i].getContext('2d'), viewport: vp }).promise
    }
    for (let i = 0; i < 4; i++) await draw(i)
    progress(1)

    // conteneur à la taille exacte de la double page, centré ; livre fermé (couverture seule) : recentré sur la page
    const stage = document.createElement('div'); stage.className = 'book__stage'
    stage.style.setProperty('--bw', 2 * w + 'px'); stage.style.setProperty('--bh', h + 'px'); el.append(stage)
    const center = (k) => { const n = pdf.numPages; stage.style.transform = k === 0 ? `translateX(${-w / 2}px)` : k >= n - 1 && n % 2 === 0 ? `translateX(${w / 2}px)` : 'none' }
    center(0)
    const book = new PageFlip(stage, {
      width: w, height: h, size: 'fixed', showCover: true, usePortrait: true, mobileScrollSupport: true,
      maxShadowOpacity: 0.45, flippingTime: 900, drawShadow: true,
    })
    book.loadFromHTML(pages)
    // pages voisines dessinées à chaque tourne ; le reste, tranquillement, quand le navigateur est libre
    const around = (k) => { for (let d = -2; d <= 5; d++) draw(k + d) }
    book.on('flip', (e) => { around(e.data); center(e.data) })
    let next = 4
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200))
    const fill = () => { if (next < pdf.numPages) draw(next++).then(() => idle(fill)) }
    idle(fill)
    fig.dataset.state = 'ready'
  } catch (e) {
    console.error('livre', e)
    fig.dataset.state = 'error'
  }
}

export function initBooks() {
  const figs = [...document.querySelectorAll('figure.book[data-book]')]
  if (!figs.length) return
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target) } }), { rootMargin: '300px' })
  figs.forEach((f) => io.observe(f))
}
