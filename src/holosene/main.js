/**
 * holosene.fr (page d'attente) : fond uni, logotype HOLOSENE du pack en grand au centre, rendu à l'encre (ink-word.js) ;
 * il se trace tout seul au chargement (une boule parcourt les lettres, comme le nom du portfolio), une seule fois.
 */
import 'virtual:iris.css'
import '../styles.css'
import '../logotype.css'
import './holo.css'
import { initNameBulge } from '../name-bulge.js'
import { createInkWord } from './ink-word.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
document.documentElement.classList.add('js', 'intro-done')

// lettrage à l'encre ; sans WebGL 2 (ou carte indisponible) : le SVG du pack, renflé sous le curseur comme l'accueil
const title = document.querySelector('.holo__title')
const fallback = () => {
  title.classList.remove('ink-wait', 'ink-on')
  initNameBulge([...title.querySelectorAll('.logotype--renfle')], '')
}
let word = null
try { word = createInkWord(title.querySelector('.logotype'), { reduced, onFail: fallback }) } catch (err) { console.warn(err) }
if (!word) fallback()

const loop = (t) => { word?.frame(t); requestAnimationFrame(loop) }
requestAnimationFrame(loop)
