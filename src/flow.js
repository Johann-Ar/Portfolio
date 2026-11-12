/**
 * Animation « flux » de la roue (moteur du kit : design/logo-kit/src/iris-flow.js, utilisé tel quel). La roue ne tourne
 * pas : la largeur de chaque couleur respire, des vagues la parcourent, le rose reste en haut.
 * Une seule texture 1D par image (512 × 1, RGBA, même convention que IRIS_STOPS : 0 = bas, sens horaire), partagée par
 * le chargeur, le « o » de l'accueil et l'anneau de la lentille ; même horloge pour tous (performance.now()), donc aucun
 * saut de couleur au passage de relais. Tampon réutilisé : aucune allocation par image.
 */
import { irisFlowLUT, irisFlowMix, IRIS_FLOW } from '../design/logo-kit/src/iris-flow.js'
import { smoothRing } from './flow-ring.js'

// accueil : les réglages « idle » du kit sont si discrets que le flux passe inaperçu ; on les pousse au maximum des
// plages autorisées par le kit (commentaires de iris-flow.js), sans en sortir
Object.assign(IRIS_FLOW.idle, { breath: 0.45, breathPeriod: 8, waves: 0.8, waveSpeed: 0.07, waveWidth: 1.2 })
// et le logo de l'accueil prend 70 % des réglages « loading » du kit (mélange irisFlowMix du kit) : un flux bien visible
export const FLOW_HOME_MIX = 0.7

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const t0 = performance.now()

export const FLOW = {
  size: 512,
  lut: new Uint8Array(512 * 4),
  version: 0,       // incrémenté à chaque nouvelle texture (gl.js la ré-envoie au GPU)
  mix: FLOW_HOME_MIX, // 0 : réglages idle, 1 : loading ; logo de l'accueil
  glNeeds: true,    // logo de l'accueil ou lentille à l'écran (fixé par gl.js)
  loaderNeeds: false, // (chargeur en CSS : n'utilise plus la texture)
  hoverTarget: 0,   // 1 quand le curseur survole le « o » du logo (gl.js)
  hoverU: 0,        // position du curseur sur la roue (0 en bas, sens horaire)
  hoverX: 0, hoverY: 0, // centre du « o » à l'écran (px CSS) : le fond s'y teinte de la couleur survolée (backdrop.js)
  hoverRGB: [0, 0, 0], // couleur réellement affichée sous le curseur (0 à 1), lue dans la roue déformée
  frozen: false,    // panneau ?debug=iris : roue finale (amount = 0)
  cpuMs: 0,         // temps de calcul de la dernière texture (mesure)
  t0,               // début de la montée du flux (fixé au relais du chargeur)
  agitate: 0,       // 0 à 1 : curseur agité sur la roue de la lentille (gl.js) ; le flux va plus vite
  calm: 1,          // 1 : flux normal ; 0 : roue fixe du kit (écran tactile, juste avant le relais à l'image ; gl.js)
}

// l'intensité monte de 0 à 1 en 1,2 s (ease-out) à partir de FLOW.t0 : le relais du chargeur (main.js), dont la roue
// est la roue fixe du kit (amount 0) : aucun saut de couleur ; animations réduites : 0 (roue finale)
const amountAt = (now) => {
  if (reduced || FLOW.frozen) return 0
  const x = Math.min(1, Math.max(0, (now - FLOW.t0) / 1200))
  return (1 - Math.pow(1 - x, 3)) * FLOW.calm
}

// survol du « o » du logo (FLOW.hoverTarget, FLOW.hoverU : fixés par gl.js) : la couleur sous le curseur s'élargit. La
// roue est déformée autour de la position du curseur (u) : s = u + d − A·sin(2πd)/2π, d = écart à u ; pente 1 − A au
// curseur (la couleur s'étale jusqu'à 1/(1 − A) fois), 1 + A à l'opposé ; continu, sans pli. Ressorts doux : A monte
// et redescend, la position suit le curseur (chemin le plus court sur la roue).
const GROW_MAX = 0.6            // jusqu'à 2,5 fois la place de la couleur survolée
const GROW_IN = 0.6, GROW_OUT = 0.95, FOLLOW = 0.32   // constantes de temps (s) : lent et fluide
const N = 512, tmp = new Float32Array(N * 3), acc = new Float32Array(N * 3)
let lastAmount = -1, clock = 0, lastNow = null, grow = 0, focus = 0, speed = 1
const AGITATE_MAX = 3   // vitesse du flux quand on agite la roue (× le rythme passif)
export function updateFlow(now) {
  const dt = lastNow === null ? 0 : Math.min(0.1, (now - lastNow) / 1000); lastNow = now
  // roue de la lentille agitée par le curseur : le flux accélère (jusqu'à × AGITATE_MAX), revient doucement à son rythme
  const sp = 1 + (AGITATE_MAX - 1) * FLOW.agitate
  speed += (sp - speed) * (1 - Math.exp(-dt / (sp > speed ? 0.25 : 0.9)))
  clock += dt * speed
  const tgt = FLOW.hoverTarget ? GROW_MAX : 0
  grow += (tgt - grow) * (1 - Math.exp(-dt / (tgt > grow ? GROW_IN : GROW_OUT)))
  if (FLOW.hoverTarget) { const d = ((FLOW.hoverU - focus + 1.5) % 1) - 0.5; focus = (focus + d * (1 - Math.exp(-dt / FOLLOW)) + 1) % 1 }
  const amount = amountAt(now)
  // pause : rien de visible, ou roue figée déjà calculée
  if (!(FLOW.glNeeds || FLOW.loaderNeeds) || (amount === 0 && lastAmount === 0 && grow < 1e-3)) return
  const s = performance.now()
  const cfg = irisFlowMix(FLOW.mix)
  cfg.amount = amount
  irisFlowLUT(clock, cfg, N, FLOW.lut)
  smoothRing(FLOW.lut, tmp, acc)   // transitions de couleur fondues (même calcul que le chargeur, flow-ring.js)
  // déformation autour de la couleur survolée (interpolation linéaire : continue, sans saut)
  for (let i = 0; i < N; i++) {
    const u = i / N, d = ((u - focus + 1.5) % 1) - 0.5
    const x = (((focus + d - grow * Math.sin(2 * Math.PI * d) / (2 * Math.PI)) % 1 + 1) % 1) * N
    const i0 = Math.floor(x), f = x - i0, a = i0 % N, b2 = (a + 1) % N
    for (let c = 0; c < 3; c++) FLOW.lut[i * 4 + c] = Math.round(tmp[a * 3 + c] + (tmp[b2 * 3 + c] - tmp[a * 3 + c]) * f)
  }
  { const i = Math.floor(focus * N) % N; FLOW.hoverRGB = [0, 1, 2].map((c) => FLOW.lut[i * 4 + c] / 255) }
  FLOW.cpuMs = performance.now() - s
  FLOW.version++
  lastAmount = amount
}

export { IRIS_FLOW }
