/**
 * Livre feuilletable (fiche Mondes Immergés) : StPageFlip (page-flip, MIT) pour le feuilletage avec courbure de page et
 * glisser au doigt. Les pages sont des images WebP rendues à l'avance depuis le PDF (dossier data-book, 001.webp…) :
 * plus de PDF de 13 Mo à télécharger ni à dessiner. Les premières pages sont préchargées dès que le navigateur est
 * libre ; le livre se monte à l'ouverture de la fiche, les autres pages arrivent au fil de la lecture.
 */
const src = (fig, i) => `${fig.dataset.book}/${String(i + 1).padStart(3, '0')}.webp`   // i : index 0..n-1
const FIRST = 4   // couverture et première double page

async function mount(fig) {
  if (fig.dataset.state) return
  fig.dataset.state = 'loading'
  const el = fig.querySelector('.book__mount'), bar = fig.querySelector('.book__bar i')
  const progress = (k) => { if (bar) bar.style.width = Math.round(k * 100) + '%' }
  try {
    const n = +fig.dataset.pages, ratio = +fig.dataset.ratio
    const imgs = []
    const load = (i) => {   // image de la page i, chargée une seule fois
      if (i < 0 || i >= n) return Promise.resolve()
      const img = imgs[i]
      if (!img.src) { img.src = src(fig, i); img.decode?.().catch(() => {}) }
      return img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r })
    }
    const pages = []
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div'); p.className = 'book__page'
      if (i === 0 || i === n - 1) p.dataset.density = 'hard'   // couvertures rigides
      const img = new Image(); img.alt = ''; img.draggable = false; img.decoding = 'async'
      p.append(img); pages.push(p); imgs.push(img)
    }
    const [{ PageFlip }] = await Promise.all([
      import('page-flip'),
      Promise.all([...Array(FIRST).keys()].map((i) => load(i).then(() => progress((i + 1) / FIRST)))),
    ])

    // taille d'une page : la double page tient dans le cadre (marges comprises)
    const box = { width: fig.offsetWidth, height: fig.offsetHeight }   // sans les transformations de l'animation d'ouverture
    const h = Math.floor(Math.min(box.height * 0.88, (box.width * 0.92) / 2 / ratio)), w = Math.floor(h * ratio)

    // conteneur à la taille exacte de la double page, centré ; livre fermé (couverture seule) : recentré sur la page
    const stage = document.createElement('div'); stage.className = 'book__stage'
    stage.style.setProperty('--bw', 2 * w + 'px'); stage.style.setProperty('--bh', h + 'px'); el.append(stage)
    const center = (k) => { stage.style.transform = k === 0 ? `translateX(${-w / 2}px)` : k >= n - 1 && n % 2 === 0 ? `translateX(${w / 2}px)` : 'none' }
    center(0)
    const book = new PageFlip(stage, {
      width: w, height: h, size: 'fixed', showCover: true, usePortrait: true, mobileScrollSupport: true,
      maxShadowOpacity: 0.45, flippingTime: 900, drawShadow: true,
    })
    book.loadFromHTML(pages)
    // pages voisines chargées à chaque tourne ; le reste, dans l'ordre, quand le navigateur est libre
    book.on('flip', (e) => { for (let d = -2; d <= 6; d++) load(e.data + d); center(e.data) })
    let next = FIRST
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200))
    const fill = () => { if (next < n) load(next++).then(() => idle(fill)) }
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
  // premières pages en cache dès que la page d'accueil est chargée : le livre s'ouvre aussitôt
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500))
  addEventListener('load', () => idle(() => figs.forEach((f) => { for (let i = 0; i < FIRST; i++) new Image().src = src(f, i) })), { once: true })
  // montage dès l'ouverture de la fiche (fiche fermée : display: none ; ouverte : elle couvre l'écran), où que soit le livre
  // dans la rangée horizontale
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    io.unobserve(e.target); figs.filter((f) => e.target.contains(f)).forEach(mount)
  }))
  new Set(figs.map((f) => f.closest('.fiche') || f)).forEach((el) => io.observe(el))
}
