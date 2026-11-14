/**
 * holosene.fr (page d'attente) : fond du portfolio (formes irisées derrière une plaque dépolie), logotype HOLOSENE du
 * pack (renflement sous le curseur, comme le nom de l'accueil) et grand O qui passe de l'encre à la roue numérique.
 */
import 'virtual:iris.css'
import '../styles.css'
import '../logotype.css'
import './holo.css'
import { FLOW, updateFlow } from '../flow.js'
import { createBackdrop } from '../backdrop.js'
import { initNameBulge } from '../name-bulge.js'
import { createRing } from './ring.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
document.documentElement.classList.add('js', 'intro-done')
FLOW.t0 = performance.now()
FLOW.glNeeds = true
FLOW.mix = 0   // roue au rythme passif du kit (IRIS_FLOW.idle)

let backdrop = null, ring = null
try { backdrop = createBackdrop(document.querySelector('.bg-canvas'), { reduced }) } catch (err) { console.warn(err) }
const ringEl = document.querySelector('.holo__ring')
try { ring = createRing(ringEl, { reduced }) } catch (err) { console.warn(err) }
if (!ring) document.querySelector('.holo__o').classList.add('holo__o--css')   // sans WebGL 2 : roue du kit en CSS
else ringEl.addEventListener('click', () => ring.toggle())

initNameBulge([...document.querySelectorAll('.holo__title .logotype--renfle')], '')

const loop = (t) => {
  updateFlow(t)
  backdrop?.frame(t)
  ring?.frame(t)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
