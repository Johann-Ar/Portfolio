/**
 * Renflement de JOHANN ARATA (accueil et pied de page) (comme le S du logo, gl.js) : une balle épaissit les lettres sous
 * elle, comme une balle qui passe dans un collant. Le dessin est fait par les filtres .bal-rf du SVG (logotype-svg.js) :
 * on n'y règle que la région du filtre et la place de la bosse (autour de la balle), et son ampleur (k3).
 * - survol : la balle suit le curseur avec un léger retard ; elle ne naît que si le curseur lui-même touche une lettre
 *   (pas seulement s'il passe près : sinon elle déformait des lettres qu'on ne touchait pas). Seulement à la souris.
 * - battement (nom de l'accueil) : juste après celui du S (gl.js, setNameHeart), deux boules partent de l'espace entre
 *   JOHANN et ARATA et suivent le chemin principal du tracé (name-trace-data.js) jusqu'aux deux bouts du nom.
 * Nom de l'accueil une fois entier (.bal-net), et pied de page ; hors animations réduites.
 */
import { NAME_TRACE } from './name-trace-data.js'

const R_BASE = 78          // rayon de la bosse (unités du dessin ; hauteur des lettres : 344)
const R_MIN_PX = 13   // petit nom (pied de page) : la bosse garde au moins ce rayon à l'écran, sinon elle ne se voit pas
const AMP = 0.55      // ampleur au plus fort (ajoutée à l’alpha adouci, dont le seuil est à 0,62 : environ +40 % d’épaisseur sous la balle)
const R_PAD = 30        // marge de la région du filtre autour de la bosse (≥ 3 × le flou)

let heartK = -1, kickAll = null
/** Battement du nom : avancée de 0 à 1 des deux boules, ou −1 (aucune). Appelé à chaque image par gl.js. */
export function setNameHeart(k) { if (k !== heartK) { heartK = k; kickAll?.() } }

// chemin (points) → position à la fraction f de sa longueur
const along = (pts) => {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return (f) => {
    const d = Math.min(1, Math.max(0, f)) * L[L.length - 1]; let i = 1
    while (i < L.length - 1 && L[i] < d) i++
    const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1), a = pts[i - 1], b = pts[i]
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
  }
}
const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x) }

export function initNameBulge(svgs) {
  if (!svgs.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const hoverOk = matchMedia('(hover: hover)').matches
  const items = svgs.map((el) => {
    const balls = [...el.querySelectorAll('.bal-r')].map((layer) => {
      const f = el.getElementById(layer.getAttribute('filter').slice(5, -1))
      return { layer, f, img: f?.querySelector('.bal-ri'), k: f?.querySelector('.bal-rk'), x: 0, y: 0, a: 0, shown: false }
    }).filter((b) => b.f && b.img && b.k)
    // battement : seulement le nom de l'accueil ; nom empilé (mobile) : ARATA est décalé sous JOHANN
    const st = el.dataset.empile?.split(' ').map(Number)
    const heart = el.classList.contains('logotype--balayage') && balls.length > 1
      ? [along(NAME_TRACE.paths.johann), along(NAME_TRACE.paths.arata.map(([x, y], i) => st && i > 0 ? [x + st[0], y + st[1]] : [x, y]))]
      : null
    return {
      el, balls, heart,
      // lettres du mot (géométrie seule, pour savoir si le curseur en touche une) et leur décalage (nom empilé : ARATA
      // est dans un groupe déplacé sous JOHANN)
      paths: [...el.querySelectorAll('[id^="bal-l-"] path')].map((pa) => {
        const g = pa.parentElement.closest('g[transform]'), m = g?.transform.baseVal.consolidate()?.matrix
        return [pa, m ? m.e : 0, m ? m.f : 0]
      }),
      pt: el.createSVGPoint(),
    }
  }).filter((it) => it.balls.length)
  if (!items.length) return
  const onInk = (it, x, y) => it.paths.some(([pa, dx, dy]) => { it.pt.x = x - dx; it.pt.y = y - dy; return pa.isPointInFill(it.pt) })
  let px = -1e9, py = -1e9, raf = 0, last = 0
  const follow = (a, b, tau, dt) => a + (b - a) * (1 - Math.exp(-dt / tau))
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }
  kickAll = kick
  if (hoverOk) {
    addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; kick() }, { passive: true })
    document.documentElement.addEventListener('pointerleave', () => { px = py = -1e9; kick() })
  }
  addEventListener('scroll', kick, { passive: true })

  const place = (it, b) => {
    const show = b.a > 0
    if (show !== b.shown) { b.layer.style.display = show ? '' : 'none'; b.shown = show }
    if (!show) return
    const e = b.a * b.a * (3 - 2 * b.a)   // montée et retombée en douceur
    const R = Math.max(R_BASE, R_MIN_PX / (it.el.getScreenCTM()?.a || 1)), PAD = R_PAD
    b.f.setAttribute('x', (b.x - R - PAD).toFixed(1)); b.f.setAttribute('y', (b.y - R - PAD).toFixed(1))
    b.f.setAttribute('width', 2 * (R + PAD)); b.f.setAttribute('height', 2 * (R + PAD))
    b.img.setAttribute('x', (b.x - R).toFixed(1)); b.img.setAttribute('y', (b.y - R).toFixed(1))
    b.img.setAttribute('width', 2 * R); b.img.setAttribute('height', 2 * R)
    b.k.setAttribute('k3', (AMP * e).toFixed(3))
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now
    let busy = false
    for (const it of items) {
      const r = it.el.getBoundingClientRect()
      const on = r.width > 0 && r.bottom > 0 && r.top < innerHeight && (!it.el.classList.contains('logotype--balayage') || it.el.classList.contains('bal-net'))
      const [b0, b1] = it.balls
      let tx = b0.x, ty = b0.y, near = false
      if (on && px > r.left - 40 && px < r.right + 40 && py > r.top - 40 && py < r.bottom + 40) {
        const p = new DOMPoint(px, py).matrixTransform(it.el.getScreenCTM().inverse())
        if (onInk(it, p.x, p.y)) { tx = p.x; ty = p.y; near = true }
      }
      if (!near && on && it.heart && heartK >= 0) {
        // battement : deux boules, du centre vers les deux bouts (départ et arrivée ralentis, comme celles du S) ; leur
        // ampleur monte au départ et retombe avant l'arrivée
        const f = 0.5 - 0.5 * Math.cos(Math.PI * heartK), amp = ss(heartK / 0.12) * (1 - ss((heartK - 0.8) / 0.18))
        it.balls.forEach((b, i) => { [b.x, b.y] = it.heart[i](f); b.a = amp; place(it, b) })
        busy = true
        continue
      }
      if (b0.a < 0.01 && near) { b0.x = tx; b0.y = ty }   // nouvelle entrée : la balle part du curseur
      b0.x = follow(b0.x, tx, 0.07, dt); b0.y = follow(b0.y, ty, 0.07, dt)
      b0.a = follow(b0.a, near ? 1 : 0, near ? 0.18 : 0.35, dt)
      if (!near && b0.a < 0.003) b0.a = 0
      place(it, b0)
      // l'autre boule (battement) s'éteint vite si le survol l'interrompt
      if (b1) { b1.a = b1.a < 0.003 ? 0 : follow(b1.a, 0, 0.08, dt); place(it, b1); if (b1.a > 0) busy = true }
      // en mouvement (balle ou ampleur) : image suivante ; à l'arrêt sous un curseur immobile, rien à recalculer
      if ((near ? 1 - b0.a > 0.002 : b0.a > 0) || Math.hypot(tx - b0.x, ty - b0.y) > 0.5) busy = true
    }
    raf = busy ? requestAnimationFrame(frame) : 0
  }
}
