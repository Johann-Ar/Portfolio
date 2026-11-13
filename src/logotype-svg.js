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
 * - balayage  : apparition du centre vers les côtés où chaque endroit du mot passe, à son tour, de flou et transparent à net
 *               et plein (comme les mots des textes, mais en continu). Trois copies du mot (très floue, un peu floue,
 *               nette), chacune découverte par un masque en dégradé (ARRETS arrêts répartis sur la largeur du mot) ;
 *               main.js (sweep) recalcule l'opacité de chaque arrêt selon l'avancée (data-bande, data-retenue). Une
 *               marge (--m) autour du dessin laisse la place au halo du flou ; le CSS la compense par des marges
 *               négatives : le mot reste exactement à sa place.
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

// balayage — réglages :
//   flous   : flou des deux copies floues (unités du dessin)
//   bande   : largeur de la zone de passage du flou au net, en part de la largeur du mot
//   retenue : 0 = chaque endroit devient net et plein dès que la bande l'a traversé ; 1 = rien n'est entièrement net
//             et plein avant la fin : la première lettre continue de se préciser jusqu'à l'arrivée de la dernière, et
//             tout le nom devient net en même temps (valeurs intermédiaires : entre les deux)
//   marge   : marge autour du dessin pour le halo (≥ 3 × le plus grand flou)
const BAL = { flous: [26, 11], bande: 0.4, retenue: 1, marge: 80 }
const ARRETS = 33   // arrêts des dégradés, répartis sur la largeur du mot
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
const renfDefs = (u) => `<filter id="bal-rf-${u}" class="bal-rf" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">`
  + `<feGaussianBlur in="SourceAlpha" stdDeviation="${RENF.flou}" result="b"/>`
  + `<feImage class="bal-ri" href="${BOSSE}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="i"/>`
  + `<feComposite class="bal-rk" in="b" in2="i" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" result="s"/>`
  + `<feComponentTransfer in="s" result="t"><feFuncA type="linear" slope="60" intercept="-36.7"/></feComponentTransfer>`
  + `<feFlood flood-color="currentColor"/><feComposite in2="t" operator="in"/></filter>`
const renfCouche = (u) => `<g class="bal-r" filter="url(#bal-rf-${u})" style="display:none"><use href="#bal-l-${u}"/></g>`

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

  const [x, y, w, h] = viewBox.split(/\s+/).map(Number), M = BAL.marge
  const box = `x="${x - M}" y="${y - M}" width="${w + 2 * M}" height="${h + 2 * M}"`
  // dégradés : de x à x + w ; au départ, mot entièrement net (copie nette seule : rendu sans JavaScript)
  const defs = [0, 0, 1].map((a, k) => `<linearGradient id="bal-g${k}-${u}" class="bal-g" gradientUnits="userSpaceOnUse" x1="${x}" x2="${x + w}" y1="0" y2="0">`
      + Array.from({ length: ARRETS }, (_, i) => `<stop offset="${(i / (ARRETS - 1)).toFixed(4)}" stop-color="#fff" stop-opacity="${a}"/>`).join('') + '</linearGradient>'
      + `<mask id="bal-m${k}-${u}" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="url(#bal-g${k}-${u})"/></mask>`).join('')
    + BAL.flous.map((f, k) => `<filter id="bal-f${k}-${u}" filterUnits="userSpaceOnUse" ${box} color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${f}"/></filter>`).join('')
    + `<g id="bal-l-${u}">${motG()}</g>` + renfDefs(u)
  // copies floues : un rectangle invisible de la taille de la marge agrandit la boîte du groupe flouté (Safari limite
  // sinon le flou à la boîte des lettres et coupe net le halo)
  const couche = (k) => `<g class="bal-c bal-c${k}" mask="url(#bal-m${k}-${u})">` + (k < 2
    ? `<g filter="url(#bal-f${k}-${u})"><rect ${box} fill="#000" fill-opacity="0"/><use href="#bal-l-${u}"/></g>`
    : `<use href="#bal-l-${u}"/>`) + '</g>'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - M} ${y - M} ${w + 2 * M} ${h + 2 * M}" class="${classes} logotype--balayage"${id ? ` id="${id}"` : ''} ${a11y}`
    + ` data-bande="${BAL.bande}" data-retenue="${BAL.retenue}" style="--m:${(M / w).toFixed(5)}">`
    + `${titre}<defs>${defs}</defs>${couche(0)}${couche(1)}${couche(2)}${renflement ? renfCouche(u) : ''}</svg>`
}
