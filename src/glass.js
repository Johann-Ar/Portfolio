/**
 * Verre des formes de la marque (monogramme de l'accueil, chargeur), selon la méthode établie des rendus « liquid glass » :
 * - la forme est une plaque de verre à bord arrondi : profil de hauteur convexe (squircle) sur une largeur de biseau B,
 *   calculé à partir de la distance exacte à l'arête ; le dessus est plat, donc parfaitement transparent ;
 * - normale 3D tirée de la pente du profil ; réfraction par la loi de Snell (indice ~1,5, légèrement différent pour
 *   R, V et B : dispersion) ; le fond est lu à l'endroit dévié ;
 * - réflexion de Fresnel (approximation de Schlick, F0 = 0,04) d'un environnement de studio, et reflet spéculaire net.
 * Modèle en GLSL (GLASS_GLSL, utilisé par gl.js).
 */
export const GLASS_GLSL = `
// profil du biseau : hauteur h(x), x = distance / largeur du biseau (0 à l'arête, 1 sur le plat)
float glassH(float x) { x = clamp(x, 0.0, 1.0); return pow(1.0 - pow(1.0 - x, 4.0), 0.25); }
// normale 3D (z vers l'écran) ; n2 : normale sortante dans le plan, d : distance à l'arête, B : biseau, T : épaisseur
vec3 glassNormal(float d, vec2 n2, float B, float T) {
  float x = d / B, e = 0.02;
  float slope = (glassH(x + e) - glassH(x - e)) / (2.0 * e) * T / B;
  return normalize(vec3(n2 * slope, 1.0));
}
// environnement de studio : grand panneau clair en haut à gauche, sol sombre
vec3 glassEnv(vec3 r) {
  float top = smoothstep(-0.2, 0.9, -r.y);
  float key = pow(max(dot(r, normalize(vec3(-0.55, -0.65, 0.5))), 0.0), 7.0);
  return vec3(0.05) + vec3(0.9) * top + vec3(2.2) * key;
}
float glassFresnel(vec3 n) { float c = clamp(n.z, 0.0, 1.0); return 0.04 + 0.96 * pow(1.0 - c, 5.0); }
// décalage de lecture du fond pour un indice donné (px) : rayon réfracté traversant l'épaisseur T
vec2 glassShift(vec3 n, float ior, float T) { vec3 r = refract(vec3(0.0, 0.0, -1.0), n, 1.0 / ior); return r.xy / max(-r.z, 0.2) * T; }
vec3 glassSpec(vec3 n) {
  vec3 L = normalize(vec3(-0.55, -0.65, 0.55)), H = normalize(L + vec3(0.0, 0.0, 1.0));
  return vec3(1.0) * pow(max(dot(n, H), 0.0), 36.0) * 1.1;
}`

/** Distance euclidienne à l'extérieur de la forme (algorithme de Felzenszwalb et Huttenlocher), masque binaire. */
export function insideDistance(inside, w, h) {
  const INF = 1e12, m = Math.max(w, h), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1)
  const g = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = inside[i] ? INF : 0
  const pass = (n) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]] }
  }
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; pass(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y] }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; pass(w); for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]) }
  return g
}
