/**
 * holosene.fr (page d'attente) : fond uni, logotype HOLOSENE du pack en grand au centre, rendu à l'encre (ink-word.js) ;
 * il se trace tout seul au chargement (une boule parcourt les lettres, comme le nom du portfolio), une seule fois.
 * Au-dessus, le gros logo S·o de l'accueil, à la même encre, se trace d'abord ; le mot part quand il est entier.
 */
import 'virtual:iris.css'
import '../styles.css'
import '../logotype.css'
import './holo.css'
import { createInkWord, INK_ART } from './ink-word.js'

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
try { word = createInkWord(title.querySelector('.logotype'), { wait: true, reduced, onFail: fallback, onTraced: showLink }) } catch (err) { console.warn(err) }
if (!word) fallback()

// logo d'abord ; sans encre pour lui (repli : son image fixe), le mot part tout de suite
const mono = document.querySelector('.holo__mono')
const startWord = () => word?.play()
const monoFallback = () => { mono.classList.remove('ink-wait', 'ink-on'); startWord() }
let logo = null
try { logo = createInkWord(mono.querySelector('img'), { art: INK_ART.monogram, reduced, onFail: monoFallback, onTraced: startWord }) } catch (err) { console.warn(err) }
if (!logo) monoFallback()

const loop = (t) => { logo?.frame(t); word?.frame(t); requestAnimationFrame(loop) }
requestAnimationFrame(loop)
