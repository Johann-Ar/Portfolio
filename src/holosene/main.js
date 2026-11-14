/**
 * holosene.fr (page d'attente) : fond uni, logotype HOLOSENE du pack en grand au centre, rendu à l'encre (ink-word.js) ;
 * il se trace tout seul au chargement (une boule parcourt les lettres, comme le nom du portfolio), une seule fois.
 */
import 'virtual:iris.css'
import '../styles.css'
import '../logotype.css'
import './holo.css'
import { createInkWord } from './ink-word.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
document.documentElement.classList.add('js', 'intro-done')

// lettrage à l'encre ; sans WebGL 2 (ou carte indisponible) : le SVG du pack, fixe
const title = document.querySelector('.holo__title')
// le lien « Portfolio » n'apparaît qu'une fois le mot entier
const showLink = () => document.body.classList.remove('trace-wait')
const fallback = () => {
  showLink()
  title.classList.remove('ink-wait', 'ink-on')
}
let word = null
try { word = createInkWord(title.querySelector('.logotype'), { reduced, onFail: fallback, onTraced: showLink }) } catch (err) { console.warn(err) }
if (!word) fallback()

const loop = (t) => { word?.frame(t); requestAnimationFrame(loop) }
requestAnimationFrame(loop)
