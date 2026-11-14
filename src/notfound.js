/**
 * Page 404 (servie par l'hébergeur à n'importe quelle adresse inconnue) : légère, sans le script de l'accueil.
 * - Une seule langue : anglais si l'adresse demandée est sous /en/, sinon selon la langue du navigateur.
 * - Le « 0 » est l'anneau du kit (rayon intérieur 0,514), animé par le flux du kit (iris-flow.js, jamais de rotation).
 * - Même fond que le site (backdrop.js).
 */
import 'virtual:iris.css'
import './styles.css'
import './notfound.css'
import { irisFlowCss, irisFlowMix } from '../design/logo-kit/src/iris-flow.js'
import { cssConic } from '../design/logo-kit/src/iris.js'
import { FLOW, updateFlow } from './flow.js'
import { createBackdrop } from './backdrop.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const root = document.documentElement
root.classList.add('js', 'intro-done')

const en = /\/en(\/|$)/.test(location.pathname) || !/^fr\b/i.test(navigator.language || 'fr')
if (en) {
  root.lang = 'en'
  document.title = 'Page not found · JOHANN ARATA'
  for (const el of document.querySelectorAll('[data-en]')) el.textContent = el.dataset.en
  for (const el of document.querySelectorAll('[data-en-href]')) el.href = el.dataset.enHref
}

const ring = document.querySelector('.nf__o')
ring.style.background = cssConic()

FLOW.t0 = performance.now()
FLOW.glNeeds = true
FLOW.mix = 0
let backdrop = null
try { backdrop = createBackdrop(document.querySelector('.bg-canvas'), { reduced }) } catch (err) { console.warn(err) }

// flux du kit sur l'anneau (réglages du logo de l'accueil), monté en douceur depuis la roue fixe
const cfg = irisFlowMix(0.7)
let frame = 0
const loop = (t) => {
  updateFlow(t)
  backdrop?.frame(t)
  if (!reduced && frame++ % 2 === 0) {
    cfg.amount = Math.min(1, (t - FLOW.t0) / 1200)
    ring.style.background = irisFlowCss(t / 1000, cfg)
  }
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
