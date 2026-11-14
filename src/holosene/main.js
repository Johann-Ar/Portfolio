/**
 * holosene.fr (page d'attente) : fond du portfolio (formes irisées derrière une plaque dépolie), logotype HOLOSENE du
 * pack rendu à l'encre (ink-word.js) et grand O qui passe de l'encre à la roue numérique.
 */
import 'virtual:iris.css'
import '../styles.css'
import '../logotype.css'
import './holo.css'
import { FLOW, updateFlow } from '../flow.js'
import { createBackdrop } from '../backdrop.js'
import { initNameBulge } from '../name-bulge.js'
import { createRing } from './ring.js'
import { createInkWord } from './ink-word.js'

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

// lettrage à l'encre (comme le grand O) ; sans WebGL 2 : le SVG du pack, renflé sous le curseur comme l'accueil
let word = null
try { word = createInkWord(document.querySelector('.holo__title .logotype'), { reduced }) } catch (err) { console.warn(err) }
if (!word) initNameBulge([...document.querySelectorAll('.holo__title .logotype--renfle')], '')

const loop = (t) => {
  updateFlow(t)
  backdrop?.frame(t)
  ring?.frame(t)
  word?.frame(t)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
