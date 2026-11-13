/**
 * Composant « logotype » : HOLOSENE ou JOHANN ARATA en SVG dans la page (inline), à partir des fichiers du pack
 * (public/logotypes/svg/, export Figma). Rien n'est redessiné : chaque morceau soudé reste un <path> à part
 * (les lettres se chevauchent, les ligatures ne doivent pas devenir des trous), remplie en currentColor.
 * Utilisé à la compilation par src/render.js.
 *
 *   logotypeSvg({ mot: 'holosene' | 'johann-arata', className: '...', id: 'unique', decoratif: true, empile: true, balayage: true })
 *
 * - decoratif : quand le texte est déjà lu ailleurs (titre caché pour lecteurs d'écran) → aria-hidden, sans <title>.
 * - empile    : JOHANN au-dessus de ARATA, centrés (accueil sur mobile).
 * - renflement : (par défaut avec balayage) le mot se renfle sous le curseur, comme le S du logo (name-bulge.js).
 * - balayage  : apparition tracée au défilement (name-trace.js, comme le S du logo) : le SVG garde le mot net (copie
 *               #bal-l-…, montrée quand le tracé est fini) ; pendant le tracé, un canvas posé dessus le dessine. Une
 *               marge (--m) autour du dessin laisse la place aux boules ; le CSS la compense par des marges négatives :
 *               le mot reste exactement à sa place. Nom empilé : data-empile donne le décalage d'ARATA.
 * Taille : par le CSS (largeur), la hauteur suit le dessin ; couleur : propriété CSS color.
 */
import { readFileSync } from 'node:fs'

const MOTS = { 'holosene': 'HOLOSENE', 'johann-arata': 'JOHANN ARATA' }
const sources = {}
const lire = (mot) => sources[mot] ??= readFileSync(new URL(`../public/logotypes/svg/${mot}.svg`, import.meta.url), 'utf8')

// JOHANN ARATA empilé : le dessin est en morceaux soudés (pack v2 : 3 <path class="piece">) ; JOHANN de x 6 à 1631,
// ARATA de x 1667 à 3046. Les morceaux qui commencent à droite de l'espace entre les deux mots (coupe à x 1649) forment
// ARATA : il est ramené sous JOHANN, centré, 400 unités plus bas (hauteur 344 + interligne). Repérage par la position,
// indépendant des noms de classes du pack
const EMPILE = { coupe: 1649, dx: (6 + 1631) / 2 - (1667 + 3046) / 2, dy: 400, viewBox: '0 -14 1637 772' }
const gaucheDe = (p) => Math.min(...(p.match(/\sd="([^"]+)"/)?.[1].match(/-?\d+(?:\.\d+)?/g) || []).filter((_, i) => i % 2 === 0).map(Number))

const MARGE = 80   // marge autour du dessin (balayage), unités
// renflement au survol (balle qui passe dans un collant, comme le S du logo) : copie du mot passée dans un filtre qui
// adoucit son contour (flou de l'alpha), y ajoute une bosse en cloche autour du curseur (image d'un dégradé radial) et
// retaille net (seuil, au-dessus du contour : sans bosse, la copie reste dans les lettres), posée sur le mot d'origine :
// aucun masque à bord progressif, tout reste net. main.js (name-bulge.js) place
// la bosse et règle son ampleur (k3). flou : unités du dessin
const RENF = { flou: 9 }
const BOSSE = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><radialGradient id="g">`
  + [[0, 1], [0.25, 0.86], [0.5, 0.5], [0.75, 0.16], [1, 0]].map(([o, a]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${a}"/>`).join('')
  + `</radialGradient><circle cx="1" cy="1" r="1" fill="url(#g)"/></svg>`)

// renflement : filtre (région, image et ampleur réglées par name-bulge.js) et copie filtrée du mot (#bal-l-u), posée sur
// le mot. Seuil raide : alpha × 60 − 36,7, bords nets même dans les creux où l'alpha adouci varie peu ; contour à 0,62 :
// sans bosse, la copie reste dans les lettres et ne bouche pas les creux étroits
// deux couches (n = 0, 1) : la balle du survol (couche 0), ou les deux boules du battement (une de chaque côté du nom)
const renfDefs = (u) => [0, 1].map((n) => `<filter id="bal-rf${n || ''}-${u}" class="bal-rf" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">`
  + `<feGaussianBlur in="SourceAlpha" stdDeviation="${RENF.flou}" result="b"/>`
  + `<feImage class="bal-ri" href="${BOSSE}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="i"/>`
  + `<feComposite class="bal-rk" in="b" in2="i" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" result="s"/>`
  + `<feComponentTransfer in="s" result="t"><feFuncA type="linear" slope="60" intercept="-36.7"/></feComponentTransfer>`
  + `<feFlood flood-color="currentColor"/><feComposite in2="t" operator="in"/></filter>`).join('')
const renfCouche = (u) => [0, 1].map((n) => `<g class="bal-r" filter="url(#bal-rf${n || ''}-${u})" style="display:none"><use href="#bal-l-${u}"/></g>`).join('')

let compteur = 0
// numérotation des id internes : remise à zéro au début de chaque page (render.js), pour que les pages FR et EN aient
// exactement les mêmes id. Le changement de langue sans rechargement (lang-swap.js) recopie l'attribut href des <use>
// de l'autre page : avec des numéros différents, le nom pointait vers un dessin absent et disparaissait.
export const resetLogotypes = () => { compteur = 0 }
export function logotypeSvg({ mot = 'holosene', className = '', id = '', decoratif = false, empile = false, balayage = false, renflement = balayage } = {}) {
  if (!MOTS[mot]) throw new Error(`logotype inconnu : ${mot}`)
  const src = lire(mot)
  let viewBox = src.match(/viewBox="([^"]+)"/)[1]
  let lettres = src.match(/<path [^>]*\/>/g)
  if (empile) {
    if (mot !== 'johann-arata') throw new Error('empile : seulement pour johann-arata')
    const enBas = (p) => gaucheDe(p) > EMPILE.coupe
    if (!lettres.some(enBas) || lettres.every(enBas)) throw new Error('empile : séparation JOHANN / ARATA introuvable dans johann-arata.svg')
    lettres = [...lettres.filter((p) => !enBas(p)),
      `<g transform="translate(${EMPILE.dx} ${EMPILE.dy})">`, ...lettres.filter(enBas), '</g>']
    viewBox = EMPILE.viewBox
  }
  const tid = `${id || `logotype-${mot}`}-titre-${++compteur}`   // id de <title> unique sur la page
  const classes = ['logotype', `logotype-${mot}`, className].filter(Boolean).join(' ')
  const a11y = decoratif ? 'aria-hidden="true" focusable="false"' : `role="img" aria-labelledby="${tid}"`
  const titre = decoratif ? '' : `<title id="${tid}">${MOTS[mot]}</title>`
  const motG = (attrs = '') => `<g class="mot" fill="currentColor" fill-rule="evenodd"${attrs}>${lettres.join('')}</g>`
  const u = tid.replace(/-titre-/, '-')   // suffixe unique des id internes
  if (!balayage) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${classes}${renflement ? ' logotype--renfle' : ''}"${id ? ` id="${id}"` : ''} ${a11y}>${titre}`
    + (renflement ? `<defs><g id="bal-l-${u}">${motG()}</g>${renfDefs(u)}</defs><use href="#bal-l-${u}"/>${renfCouche(u)}` : motG()) + '</svg>'

  const [x, y, w, h] = viewBox.split(/\s+/).map(Number), M = MARGE
  const empileAttr = empile ? ` data-empile="${EMPILE.dx} ${EMPILE.dy} ${(344 + EMPILE.dy) / 2}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - M} ${y - M} ${w + 2 * M} ${h + 2 * M}" class="${classes} logotype--balayage"${id ? ` id="${id}"` : ''} ${a11y}`
    + `${empileAttr} style="--m:${(M / w).toFixed(5)}">`
    + `${titre}<defs><g id="bal-l-${u}">${motG()}</g>${renflement ? renfDefs(u) : ''}</defs><use class="bal-net-use" href="#bal-l-${u}"/>${renflement ? renfCouche(u) : ''}</svg>`
}
