/**
 * Gabarit des pages : rendu à la compilation (vite.config.js) pour chaque langue.
 * Tout le contenu est dans le HTML publié (lisible sans JavaScript). Les fiches projet s'ouvrent par l'ancre
 * #p-<slug> (CSS :target), le JavaScript ajoute focus, Échap et piégeage du focus.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { site, ui, projects as allProjects, research, studio, about, workIntro } from './content.js'
import sizes from './media-sizes.json' with { type: 'json' }
import { logotypeSvg, resetLogotypes } from './logotype-svg.js'

const projects = allProjects.filter((p) => !p.hidden)   // projets masqués : ni vignette ni fiche
// travaux en cours (ongoing) : toujours en dernier de leur partie, quel que soit leur rang dans content.js
const lastOngoing = (list) => [...list.filter((x) => !x.ongoing), ...list.filter((x) => x.ongoing)]

// version des fichiers du logo (media/ est gardé 7 jours en cache) : l'adresse change dès que le logo change, les
// téléphones et navigateurs rechargent alors le nouveau logo tout de suite (gl.js reprend ce ?v= pour monogram-sdf.png, monogram-width.png et monogram-along.png ; main.js pour name-along.png)
const MONO_V = createHash('sha256').update(['monogram-dark-base.svg', 'monogram-light-base.svg', 'monogram-sdf.png', 'monogram-width.png', 'monogram-along.png', 'name-along.png']
  .map((f) => readFileSync(new URL('../public/media/' + f, import.meta.url))).reduce((a, b) => Buffer.concat([a, b]))).digest('hex').slice(0, 10)

export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function render(lang) {
  // CV : le lien n'est publié que si le PDF existe (sinon masqué en ligne, visible avec ?dev comme les textes à fournir)
  const cvReady = existsSync(new URL(`../public/${site.cv}`, import.meta.url))
  resetLogotypes()   // mêmes id de logotypes dans chaque langue (voir logotype-svg.js)
  const t = (v) => (v && typeof v === 'object' && 'fr' in v ? v[lang] : v)
  const other = lang === 'fr' ? 'en/' : '../'
  const root = lang === 'fr' ? '' : '../'
  const m = (src) => `${root}media/${src}`

  // une carte de piste horizontale (projets, recherche) : l'image en trame de points, la lentille montre l'original
  const card = (c) => {
    const tag = c.href ? 'a' : 'div', href = c.href ? ` href="${c.href}"` : ''
    const media = c.image
      ? `<${tag} class="card__media${c.overlay ? ' card__media--badge' : ''}"${href} data-gl="card" data-cell="6"${c.color ? ' data-color' : ''}${c.text ? ` data-text="${esc(c.text)}"` : ''} data-radius="26"${c.pos ? ` data-pos="${c.pos[0]} ${c.pos[1]}" style="--pos:${c.pos[0] * 100}% ${c.pos[1] * 100}%"` : ''}${c.href ? ` aria-label="${esc(t(ui.open))} : ${esc(c.title)}"` : ' aria-hidden="true"'}>${c.imageMobile ? `<picture><source media="(max-width: 760px)" srcset="${m(c.imageMobile)}"${c.imageMobileDark ? ` data-dark="${m(c.imageMobileDark)}"` : ''}>` : ''}<img src="${m(c.image)}"${c.imageDark ? ` data-dark="${m(c.imageDark)}"` : ''} alt="" decoding="async" loading="lazy">${c.imageMobile ? '</picture>' : ''}${c.overlay ? `<span class="disp">${esc(c.badge || '')}</span>` : ''}${c.label ? `<span class="sr">${esc(c.label)}</span>` : ''}</${tag}>`
      : `<div class="card__media card__media--text"><span class="disp">${esc(c.badge || '')}</span></div>`
    return `
      <article class="card${c.todo ? ' todo' : ''}" id="${c.id}" aria-labelledby="${c.id}-t">
        ${media}
        <h3 class="card__line" id="${c.id}-t">${c.href ? `<a href="${c.href}">` : '<span>'}<span class="disp card__name">${esc(c.title)}</span> <span class="lbl card__genre">${esc(c.genre)}</span>${c.href ? '</a>' : '</span>'}${c.todo ? '' : ''}</h3>
      </article>`
  }
  // une piste : cartes, compteur, ligne de progression, flèches
  const rail = (cards, label) => `
    <div class="work__pin">
      <div class="work__track wrap" data-clip tabindex="0" aria-label="${esc(label)}"><div class="work__strip">${cards.join('')}</div></div>
    </div>`

  // fiche projet : en-tête fixe, puis une rangée qui défile à l'horizontale (texte en colonnes, images, projet suivant)
  const fiche = (p, i) => {
    const credits = [...(p.credits || []), ...(p.coverCredit ? [p.coverCredit] : [])]
    const next = projects[(i + 1) % projects.length]
    // images des fiches : chaque image prend le format le plus proche d'un jeu fixe, du 16:9 (1920 × 1080, le plus
    // large) au 9:16 (smartphone, le plus haut) ; elle est recadrée dedans (object-fit: cover), jamais déformée
    const FORMATS = [16 / 9, 3 / 2, 4 / 3, 1, 4 / 5, 2 / 3, 9 / 16]
    const format = (w, h) => FORMATS.reduce((best, f) => (Math.abs(Math.log(f * h / w)) < Math.abs(Math.log(best * h / w)) ? f : best))
    // vidéo (.mp4) : lecture muette en boucle, comme une image animée ; x.poster sert d'image d'attente
    const fig = (x) => {
      // livre feuilletable en 3D (src/book.js), pages en images : la couverture et un chargeur en attendant les pages
      if (x.book) return `<figure class="book" style="--r:1.5" data-book="${m(x.book)}" data-pages="${x.pages}" data-ratio="${x.ratio}" aria-label="${esc(t(x.alt))}">
        <img class="book__poster" src="${m(x.poster)}" alt="" loading="lazy" decoding="async">
        <div class="book__load" aria-hidden="true"><span class="book__bar"><i></i></span><span class="lbl">${lang === 'fr' ? 'Ouverture du livre' : 'Opening the book'}</span></div>
        <div class="book__mount"></div>
        <p class="book__hint" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5V4.5a1.5 1.5 0 0 1 3 0V10m0-1a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.7-2.3L3.6 14.6a1.6 1.6 0 0 1 2.4-2.1L9 15"/></svg><span class="book__hint-p">${lang === 'fr' ? 'Cliquez sur une page pour feuilleter' : 'Click a page to turn it'}</span><span class="book__hint-t">${lang === 'fr' ? 'Touchez ou glissez pour feuilleter' : 'Tap or swipe to turn the pages'}</span></p></figure>`
      const [w, h] = sizes[x.src] || [1200, 800]
      // vidéo : lue seulement quand elle est à l'écran (main.js, data-lazy), sinon en pause
      const el = /\.mp4$/.test(x.src)
        ? `<video src="${m(x.src)}"${x.poster ? ` poster="${m(x.poster)}"` : ''}${x.dark ? ` data-dark="${m(x.dark)}"` : ''}${x.posterDark ? ` data-dark-poster="${m(x.posterDark)}"` : ''} width="${w}" height="${h}" muted loop playsinline preload="none" data-lazy aria-label="${esc(t(x.alt))}"></video>`
        : `<img src="${m(x.src)}"${x.dark ? ` data-dark="${m(x.dark)}"` : ''} alt="${esc(t(x.alt))}" width="${w}" height="${h}" loading="lazy" decoding="async">`
      return `<figure style="--r:${ratio(x).toFixed(4)}">${el}</figure>`
    }
    const ratio = (x) => x.ratio || format(...(sizes[x.src] || [1200, 800]))
    // cases : grande (un média sur toute la hauteur) ou double (deux médias layout: 'stack' l'un sur l'autre, 16:9 à 4:3)
    const media = []
    for (let k = 0; k < p.media.length; k++) {
      const a = p.media[k], b = p.media[k + 1]
      if (a.layout === 'stack' && b?.layout === 'stack') {
        const r = Math.min(16 / 9, Math.max(4 / 3, ratio(a), ratio(b)))
        media.push(`<div class="duo" style="--r:${r.toFixed(4)}">${fig(a)}${fig(b)}</div>`); k++
      } else media.push(fig(a))
    }
    // un seul texte explicatif (sans rubriques) : intention et contexte, captation et traitement, mise en scène et limites
    const body = [[p.intent, p.context], [p.capture, p.processing], [p.staging, p.learned]]
      .map((g) => g.filter((v) => v && !v.todo).map((v) => esc(t(v))).join(' ')).filter(Boolean)
    // fiche technique : étiquettes alignées, sans séparateur
    const info = (label, values, todo = false) => (values.length ? `<div class="fiche__info${todo ? ' todo' : ''}"><dt>${esc(t(label))}</dt>${values.map((v) => `<dd>${v}</dd>`).join('')}</div>` : '')
    const infos = [
      info({ fr: 'Milieu', en: 'Setting' }, [esc(t(p.milieu))]),
      info(ui.role, [esc(t(p.role))], !!p.role?.todo),
      info(ui.tools, [esc(p.tools)]),
      info(ui.year, [esc(p.year)]),
      info(ui.creditsLabel, credits.filter((c) => !c.todo).map((c) => esc(t(c)))),
    ].join('')
    return `
  <section class="fiche" id="p-${p.slug}" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="p-${p.slug}-t" tabindex="-1">
    <div class="edge edge--top" aria-hidden="true"></div>
    <header class="fiche__head wrap"><div class="topbar__glass" aria-hidden="true">${'<i></i>'.repeat(5)}</div>
      <span class="disp fiche__mini" aria-hidden="true">${esc(p.title)}</span>
      <div class="fiche__tools"><a class="fiche__close" href="#${p.research ? 'recherche' : 'projet'}-${p.slug}">${esc(t(ui.close))}</a></div>
    </header>
    <div class="fiche__row">
      <div class="fiche__text">
        <h2 class="disp fiche__title" id="p-${p.slug}-t">${esc(p.title)}</h2>
        <div class="fiche__body">${body.map((x) => `<p>${x}</p>`).join('')}</div>
        <dl class="fiche__infos">${infos}</dl>
        ${p.link ? `<a class="fiche__open" href="${esc(p.link.href)}" target="_blank" rel="noopener">${esc(t(p.link.label))} ↗</a>` : ''}
      </div>
      <div class="fiche__media">${media.join('')}</div>
      <a class="fiche__next" href="#p-${next.slug}">
        <span class="lbl">${lang === 'fr' ? 'Projet suivant' : 'Next project'}</span>
        <span class="disp">${esc(next.title)} →</span>
      </a>
    </div>
  </section>`
  }

  const selected = lastOngoing(projects.filter((p) => !p.research))
  const words = (str) => str.split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ')
  // texte apparaissant mot à mot au défilement (data-sw : main.js, scrollWords) ; tous les textes de l'accueil sauf les
  // vignettes, les boutons et le pied de page (tout en bas, il ne franchirait jamais la ligne : toujours visible) ; **gras** conservé ;
  // --i : rang du mot (décalage de l'apparition)
  const seq = (str) => { let bold = false, i = 0; return esc(str).split(' ').map((w) => {
    const open = w.startsWith('**'), close = w.replace(/^\*\*/, '').endsWith('**') || (open && w.length > 4 && w.endsWith('**'))
    const word = w.replace(/\*\*/g, ''); if (open) bold = true
    const out = `<span class="w" style="--i:${i++}">${bold ? `<strong>${word}</strong>` : word}</span>`
    if (close) bold = false
    return out }).join(' ') }
  return `
<a class="skip" href="#projets">${esc(t(ui.skip))}</a>
<div class="loader" aria-hidden="true"><canvas class="loader__c"></canvas></div>
<canvas class="bg-canvas" aria-hidden="true"></canvas>
<canvas class="gl-canvas" aria-hidden="true"></canvas>
<div class="edge edge--top" aria-hidden="true"></div><div class="edge edge--bottom" aria-hidden="true"></div>
<header class="topbar wrap">
  <div class="topbar__glass" aria-hidden="true">${'<i></i>'.repeat(5)}</div>
  <nav class="topbar__nav" aria-label="${esc(t(ui.nav))}">
    <a href="#projets">${esc(t(ui.projects))}</a><a href="#a-propos">${esc(t(ui.studio))}</a><a href="#contact">${esc(t(ui.contact))}</a>
  </nav>
  <a href="#top" class="brand" aria-label="Holosene">
    <img class="brand__mark only-dark" draggable="false" src="${root}media/monogram-dark-base.svg?v=${MONO_V}" alt="Holosene" width="470" height="576">
    <img class="brand__mark only-light" draggable="false" src="${root}media/monogram-light-base.svg?v=${MONO_V}" alt="Holosene" width="470" height="576">
  </a>
  <div class="topbar__tools">
    <button class="theme-toggle" type="button" data-light="${esc(t(ui.themeLight))}" data-dark="${esc(t(ui.themeDark))}" aria-label="${esc(t(ui.themeLight))}"><span class="theme-toggle__t">${lang === "fr" ? "Sombre" : "Dark"}</span></button>
    <a class="lang" href="${other}" hreflang="${lang === 'fr' ? 'en' : 'fr'}" aria-label="FR/EN, ${esc(t(ui.langLabel))}"><span class="lang__fr">FR</span><span class="lang__sep">/</span><span class="lang__en">EN</span></a>
  </div>
</header>

<main id="top">
  <section class="hero" id="accueil" aria-labelledby="hero-t">
    <span class="hero__dock" aria-hidden="true"><img class="only-dark" src="${root}media/monogram-dark-base.svg?v=${MONO_V}" alt="" width="470" height="576" draggable="false"><img class="only-light" src="${root}media/monogram-light-base.svg?v=${MONO_V}" alt="" width="470" height="576" draggable="false"></span>
    <div class="hero__pin">
      <div class="hero__view" data-gl="mark" data-cell="6" role="img" aria-label="${esc(t(ui.lensLabel))}">
        <img src="${m('riviere-calme.webp')}" alt="" decoding="async" fetchpriority="high">
      </div>
      <div class="hero__copy">
        <div class="hero__slot" aria-hidden="true"><img class="hero__mark only-dark" src="${root}media/monogram-dark-base.svg?v=${MONO_V}" alt="" width="470" height="576"><img class="hero__mark only-light" src="${root}media/monogram-light-base.svg?v=${MONO_V}" alt="" width="470" height="576"></div>
        <h1 id="hero-t" class="hero__word"><span class="sr">Johann Arata · Holosene</span>${logotypeSvg({ mot: 'johann-arata', decoratif: true, balayage: true, className: 'studio__word hero__name studio__word--line' })}${logotypeSvg({ mot: 'johann-arata', decoratif: true, empile: true, balayage: true, className: 'studio__word hero__name studio__word--stack' })}</h1>
        <p class="hero__line" data-hwords>${words(t(studio))}</p>
        <a class="hero__cta" href="#projets" aria-label="${lang === 'fr' ? 'Voir les projets' : 'See the work'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
    </div>
  </section>

  <section class="work" id="projets" aria-labelledby="proj-t">
    <header class="sec-head wrap">
      <h2 class="disp" id="proj-t" data-sw>${seq(lang === 'fr' ? 'Projets choisis' : 'Selected work')}</h2>
      <p class="lbl sec-head__sub" data-sw>${seq(t(workIntro))}</p>
    </header>
    ${rail(selected.map((p, i) => card({ id: `projet-${p.slug}`, href: `#p-${p.slug}`, image: p.cover, imageMobile: p.coverMobile, imageDark: p.coverDark, imageMobileDark: p.coverMobileDark, title: p.title, genre: t(p.genre), credit: p.coverCredit && t(p.coverCredit) })), lang === 'fr' ? 'Projets, défilement horizontal' : 'Projects, horizontal scroll')}
  </section>

  <section class="work work--research" id="recherche" aria-labelledby="research-t">
    <header class="sec-head wrap">
      <h2 class="disp" id="research-t" data-sw>${seq(t(ui.research))}</h2>
      <p class="lbl sec-head__sub" data-sw>${seq(t(research.intro))}</p>
    </header>
    ${rail(lastOngoing(research.items.filter((r) => !r.hidden)).map((r, i) => card({ id: `recherche-${r.slug || i + 1}`, href: r.href, image: t(r.image), pos: r.pos, text: r.label && t(r.label), badge: r.when && t(r.when), title: t(r.title), genre: t(r.kind), todo: r.todo })), lang === 'fr' ? 'Recherche, défilement horizontal' : 'Research, horizontal scroll')}
  </section>

  <section class="about wrap" id="a-propos" aria-labelledby="about-t">
    <h2 class="lbl" id="about-t" data-sw>${seq(t(ui.studio))}</h2>
    ${about.map((a) => `<p data-sw>${seq(t(a))}</p>`).join('')}
    <div class="contact" id="contact">
      <h2 class="lbl" id="contact-t" data-sw>${seq(t(ui.contact))}</h2>
      <a class="mail" href="mailto:${esc(site.email)}" translate="no" aria-label="${esc(site.email)}, ${esc(t(ui.copy))}" data-copy="${esc(site.email)}" data-done="${esc(t(ui.copied))}"><span data-sw data-sw-letters aria-hidden="true">${[...site.email].map((ch, i) => `<span class="w" style="--i:${i}">${esc(ch)}</span>`).join('')}</span></a>
      <p class="copy-toast" role="status" aria-live="polite"></p>
      <div class="contact__row" data-reveal>
        <ul class="socials"><li${cvReady ? '' : ' class="todo"'}><a ${cvReady ? 'href' : 'data-href'}="${root}${esc(site.cv)}" download="Johann-Arata-CV.pdf" type="application/pdf">${esc(t(ui.cv))} ↗</a></li>${site.socials.map((s) => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul>
      </div>
    </div>
  </section>

</main>

<footer class="foot wrap">
  <p class="lbl">© ${new Date().getFullYear()} Portfolio · Johann Arata</p>
  ${logotypeSvg({ mot: 'johann-arata', className: 'foot__logo', renflement: true })}
  <a class="lbl" href="${root}mentions-legales.html">${esc(t(ui.legal))}</a>
</footer>

${projects.map(fiche).join('')}
<div class="fiche-veil" aria-hidden="true"></div>
<a class="fiche-brand" href="#top" aria-label="Holosene, accueil"><img class="only-dark" src="${root}media/monogram-dark-base.svg?v=${MONO_V}" alt="" width="470" height="576" draggable="false"><img class="only-light" src="${root}media/monogram-light-base.svg?v=${MONO_V}" alt="" width="470" height="576" draggable="false"></a>
`
}
