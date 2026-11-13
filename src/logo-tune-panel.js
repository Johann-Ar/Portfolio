/**
 * Barre de réglage du contraste d'épaisseur du S (développement seulement, main.js) : à gauche les épaisseurs
 * s'égalisent, à droite les pleins et les déliés s'accentuent ; repère « Base » : la version du site (1,25), « Kit » :
 * le tracé d'origine (1). Double-clic : retour à la base.
 * La valeur est gardée dans ce navigateur (localStorage).
 */
import { LOGO_TUNE, LOGO_CONTRAST_BASE as BASE } from './logo-tune.js'

const KEY = 'logo-contrast-2'   // nouvelle clé : la base est passée à 1,25, l'ancien réglage gardé ne s'applique plus

export function mountLogoTune() {
  try { const v = parseFloat(localStorage.getItem(KEY)); if (v >= 0 && v <= 2) LOGO_TUNE.contrast = v } catch { /* stockage indisponible */ }
  const el = document.createElement('div')
  el.className = 'logo-tune'
  el.innerHTML = `<style>
    .logo-tune{position:fixed;left:16px;bottom:16px;z-index:9999;display:grid;gap:8px;width:240px;padding:12px 14px;
      font:500 11px/1.2 system-ui,sans-serif;letter-spacing:.02em;color:#f6f5f2;background:rgba(20,20,20,.82);
      backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);border-radius:10px}
    .logo-tune__top{display:flex;justify-content:space-between;align-items:baseline}
    .logo-tune__top output{font-variant-numeric:tabular-nums;opacity:.9}
    .logo-tune input{width:100%;margin:0;accent-color:#f6f5f2;cursor:pointer}
    .logo-tune__ends{position:relative;height:12px;opacity:.55;font-size:10px}
    .logo-tune__ends span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
    .logo-tune__ends span:first-child{transform:none}.logo-tune__ends span:last-child{transform:translateX(-100%)}
    .logo-tune__ends .is-base{opacity:1;font-weight:600}
  </style>
  <div class="logo-tune__top"><span>Contraste d’épaisseur du S</span><output></output></div>
  <input type="range" min="0" max="2" step="0.01" aria-label="Contraste d’épaisseur du S" title="Double-clic : version de base (1,25)">
  <div class="logo-tune__ends"><span style="left:0">Égalisé</span><span style="left:calc(8px + .5 * (100% - 16px))">Kit</span><span class="is-base" style="left:calc(8px + .625 * (100% - 16px))">Base</span><span style="left:100%">Accentué</span></div>`
  const input = el.querySelector('input'), out = el.querySelector('output')
  const show = () => { out.textContent = (+LOGO_TUNE.contrast).toFixed(2) }
  const set = (v) => {
    LOGO_TUNE.contrast = Math.abs(v - BASE) < 0.03 ? BASE : Math.abs(v - 1) < 0.03 ? 1 : v   // crans : base et tracé du kit
    input.value = LOGO_TUNE.contrast; show()
    try { localStorage.setItem(KEY, LOGO_TUNE.contrast) } catch { /* stockage indisponible */ }
  }
  input.value = LOGO_TUNE.contrast; show()
  input.addEventListener('input', () => set(+input.value))
  input.addEventListener('dblclick', () => set(BASE))
  document.body.append(el)
}
