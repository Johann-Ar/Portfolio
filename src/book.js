/**
 * Livre PDF feuilletable en 3D (fiche Mondes Immergés) : bibliothèque 3D FlipBook (iberezansky, licence GPL-2.0),
 * servie depuis public/vendor/flip-book/ avec ses dépendances (jQuery, three.js, PDF.js, html2canvas).
 * Rien n'est chargé tant que le livre n'approche pas de l'écran : environ 2 Mo de scripts, puis le PDF page par page.
 */
const loaded = {}
const script = (src) => (loaded[src] ||= new Promise((ok, ko) => {
  const s = document.createElement('script'); s.src = src; s.async = false
  s.onload = ok; s.onerror = () => ko(new Error('script ' + src)); document.head.append(s)
}))

async function libs(vendor) {
  // PDF.js (ancienne API globale PDFJS) : chemin du worker lu par flip-book au chargement
  window.PDFJS_LOCALE = { pdfJsWorker: vendor + 'js/pdf.worker.js', pdfJsCMapUrl: vendor + 'cmaps/' }
  for (const f of ['js/jquery.min.js', 'js/html2canvas.min.js', 'js/three.min.js', 'js/pdf.min.js', 'flip-book.min.js']) await script(vendor + f)
}

function mount(fig) {
  if (fig.dataset.state) return
  // sans WebGL, le livre ne peut pas s'afficher : on garde la couverture (le lien « Lire l'article » reste dans la fiche)
  const c = document.createElement('canvas')
  if (!(c.getContext('webgl') || c.getContext('experimental-webgl'))) { fig.dataset.state = 'error'; return }
  fig.dataset.state = 'loading'
  const vendor = fig.dataset.vendor, el = fig.querySelector('.book__mount'), bar = fig.querySelector('.book__bar i')
  libs(vendor).then(() => {
    window.jQuery(el).FlipBook({
      pdf: fig.dataset.book,
      template: {
        html: vendor + 'templates/default-book-view.html',
        styles: [vendor + 'css/black-book-view.css'],
        links: [{ rel: 'stylesheet', href: vendor + 'css/font-awesome.min.css' }],
        script: vendor + 'js/default-book-view.js',
        sounds: { startFlip: vendor + 'sounds/start-flip.mp3', endFlip: vendor + 'sounds/end-flip.mp3' },
      },
      controlsProps: { actions: { cmdSave: { enabled: false }, cmdPrint: { enabled: false }, cmdSounds: { active: false } } },
      // pages : vraie déformation du papier (courbure, coins souples), couverture un peu plus rigide
      propertiesCallback: (p) => ({
        ...p,
        preloadPages: 4,
        sheet: { ...p.sheet, flexibility: 10, bending: 11, flexibleCorner: 0.5, wave: 0.5 },
        cover: { ...p.cover, depth: 0.0006, mass: 0.004 },
      }),
      ready: () => { fig.dataset.state = 'ready' },
    })
  }).catch(() => { fig.dataset.state = 'error' })
  // barre de progression indicative pendant le téléchargement des scripts et du PDF
  let k = 0; const tick = setInterval(() => {
    if (fig.dataset.state !== 'loading') return clearInterval(tick)
    k = Math.min(k + (100 - k) * 0.06, 95); if (bar) bar.style.width = k + '%'
  }, 120)
}

export function initBooks() {
  const figs = [...document.querySelectorAll('figure.book[data-book]')]
  if (!figs.length) return
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target) } }), { rootMargin: '200px' })
  figs.forEach((f) => io.observe(f))
}
