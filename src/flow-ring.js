/**
 * Lissage de la roue « flux » (flou circulaire : deux passes de moyenne glissante ≈ gaussien), commun au logo WebGL
 * (flow.js) et au chargeur (loader-draw.js, aussi dans un worker : aucune dépendance au DOM). Même calcul des deux côtés,
 * donc exactement la même roue au passage de relais.
 */
import { irisFlowLUT, IRIS_FLOW } from '../design/logo-kit/src/iris-flow.js'

export const RING_N = 512, RING_SMOOTH = 10

/** src : LUT RGBA (N × 4) ; tmp, acc : Float32Array(N × 3). Résultat (RGB, 0-255, non arrondi) dans tmp. */
export function smoothRing(src, tmp, acc, N = RING_N, r = RING_SMOOTH) {
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) tmp[i * 3 + c] = src[i * 4 + c]
  const w = 2 * r + 1
  for (let pass = 0; pass < 2; pass++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += tmp[((k % N) + N) % N * 3 + c]
      for (let i = 0; i < N; i++) {
        acc[i * 3 + c] = sum / w
        sum += tmp[((i + r + 1) % N) * 3 + c] - tmp[((i - r) % N + N) % N * 3 + c]
      }
    }
    tmp.set(acc)
  }
  return tmp
}

/** Roue au repos (flux à 0, lissée) telle que le « o » du logo l'affiche au relais : RGB 0-255, N × 3. */
export function restRing(N = RING_N) {
  const lut = new Uint8Array(N * 4)
  irisFlowLUT(0, { ...IRIS_FLOW.idle, amount: 0 }, N, lut)
  return smoothRing(lut, new Float32Array(N * 3), new Float32Array(N * 3), N)
}
