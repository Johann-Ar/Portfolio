/**
 * Surlignage des boutons texte (FR/EN, Sombre/Clair, menu, Fermer, liens du pied de page…) : l'aplat d'encre qui glisse
 * de la gauche et le texte en couleur du fond sont un seul calque (.hl), copie du bouton posée par-dessus et découverte
 * par un masque (clip-path, styles.css). Les lettres changent donc de couleur exactement au bord de l'aplat, comme avec
 * un masque de fusion, au lieu d'un fondu de couleur indépendant. La copie suit le texte d'origine (langue, thème).
 */
const SEL = '.topbar__nav a, .topbar .lang, .theme-toggle, .fiche__close, .socials a, .foot a, .btn--light'

function attach(el) {
  if (el.querySelector(':scope > .hl')) return
  const hl = document.createElement('span'); hl.className = 'hl'; hl.setAttribute('aria-hidden', 'true')
  const sync = () => { hl.replaceChildren(...[...el.childNodes].filter((n) => n !== hl).map((n) => n.cloneNode(true))) }
  sync(); el.append(hl); el.classList.add('hl-on')
  new MutationObserver((ms) => { if (ms.some((m) => !hl.contains(m.target) && m.target !== hl && ![...m.addedNodes].includes(hl))) sync() })
    .observe(el, { childList: true, characterData: true, subtree: true })
}

export function initHighlights() { document.querySelectorAll(SEL).forEach(attach) }
