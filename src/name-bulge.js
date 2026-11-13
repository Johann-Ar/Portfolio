/**
 * Renflement de JOHANN ARATA au survol (accueil et pied de page) (comme le S du logo, gl.js) : une balle suit le curseur avec un léger retard et
 * épaissit les lettres sous elle, comme une balle qui passe dans un collant. Le dessin est fait par le filtre .bal-rf
 * du SVG (logotype-svg.js) : on n'y règle que la région du filtre et la place de la bosse (autour de la balle), et son
 * ampleur (k3). Nom de l'accueil (une fois entièrement net, .bal-net) et du pied de page ; seulement à la souris, hors
 * animations réduites.
 */
const R_BASE = 78          // rayon de la bosse (unités du dessin ; hauteur des lettres : 344)
const R_MIN_PX = 13   // petit nom (pied de page) : la bosse garde au moins ce rayon à l'écran, sinon elle ne se voit pas
const AMP = 0.55      // ampleur au plus fort (ajoutée à l’alpha adouci, dont le seuil est à 0,62 : environ +40 % d’épaisseur sous la balle)
const R_PAD = 30        // marge de la région du filtre autour de la bosse (≥ 3 × le flou)

export function initNameBulge(svgs) {
  if (!svgs.length || !matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const items = svgs.map((el) => ({
    el, layer: el.querySelector('.bal-r'), f: el.querySelector('.bal-rf'), img: el.querySelector('.bal-ri'), k: el.querySelector('.bal-rk'),
    x: 0, y: 0, a: 0, shown: false,
  })).filter((it) => it.layer && it.f && it.img && it.k)
  if (!items.length) return
  let px = -1e9, py = -1e9, raf = 0, last = 0
  const follow = (a, b, tau, dt) => a + (b - a) * (1 - Math.exp(-dt / tau))
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; kick() }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => { px = py = -1e9; kick() })
  addEventListener('scroll', kick, { passive: true })

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now
    let busy = false
    for (const it of items) {
      const r = it.el.getBoundingClientRect()
      const on = r.width > 0 && (!it.el.classList.contains('logotype--balayage') || it.el.classList.contains('bal-net'))
      let tx = it.x, ty = it.y, near = false
      if (on && px > r.left - 40 && px < r.right + 40 && py > r.top - 40 && py < r.bottom + 40) {
        const p = new DOMPoint(px, py).matrixTransform(it.el.getScreenCTM().inverse())
        tx = p.x; ty = p.y; near = true
      }
      if (it.a < 0.01 && near) { it.x = tx; it.y = ty }   // nouvelle entrée : la balle part du curseur
      it.x = follow(it.x, tx, 0.07, dt); it.y = follow(it.y, ty, 0.07, dt)
      it.a = follow(it.a, near ? 1 : 0, near ? 0.18 : 0.35, dt)
      if (!near && it.a < 0.003) it.a = 0
      const show = it.a > 0
      if (show !== it.shown) { it.layer.style.display = show ? '' : 'none'; it.shown = show }
      if (show) {
        const e = it.a * it.a * (3 - 2 * it.a)   // montée et retombée en douceur
        const R = Math.max(R_BASE, R_MIN_PX / (it.el.getScreenCTM()?.a || 1)), PAD = R_PAD
        it.f.setAttribute('x', (it.x - R - PAD).toFixed(1)); it.f.setAttribute('y', (it.y - R - PAD).toFixed(1))
        it.f.setAttribute('width', 2 * (R + PAD)); it.f.setAttribute('height', 2 * (R + PAD))
        it.img.setAttribute('x', (it.x - R).toFixed(1)); it.img.setAttribute('y', (it.y - R).toFixed(1))
        it.img.setAttribute('width', 2 * R); it.img.setAttribute('height', 2 * R)
        it.k.setAttribute('k3', (AMP * e).toFixed(3))
      }
      // en mouvement (balle ou ampleur) : image suivante ; à l'arrêt sous un curseur immobile, rien à recalculer
      if ((near ? 1 - it.a > 0.002 : it.a > 0) || Math.hypot(tx - it.x, ty - it.y) > 0.5) busy = true
    }
    raf = busy ? requestAnimationFrame(frame) : 0
  }
}
