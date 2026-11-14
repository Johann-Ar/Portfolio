/**
 * holosene.fr (page d'attente) : fond du portfolio (formes irisées derrière une plaque dépolie) et logotype HOLOSENE du
 * pack en grand, au centre, rendu à l'encre (ink-word.js).
 */
import 'virtual:iris.css'
import '../styles.css'
import '../logotype.css'
import './holo.css'
import { createBackdrop } from '../backdrop.js'
import { initNameBulge } from '../name-bulge.js'
import { createInkWord } from './ink-word.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
document.documentElement.classList.add('js', 'intro-done')

let backdrop = null
try { backdrop = createBackdrop(document.querySelector('.bg-canvas'), { reduced }) } catch (err) { console.warn(err) }

// lettrage à l'encre ; sans WebGL 2 : le SVG du pack, renflé sous le curseur comme l'accueil
let word = null
try { word = createInkWord(document.querySelector('.holo__title .logotype'), { reduced }) } catch (err) { console.warn(err) }
if (!word) initNameBulge([...document.querySelectorAll('.holo__title .logotype--renfle')], '')

const loop = (t) => {
  backdrop?.frame(t)
  word?.frame(t)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
