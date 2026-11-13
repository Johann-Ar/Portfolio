/**
 * Réglages du logo de l'accueil (gl.js). contrast : contraste d'épaisseur du S ; 1 : tracé du kit tel quel, < 1 : les
 * épaisseurs s'égalisent (0 : toutes égales), > 1 : les pleins et les déliés s'accentuent. Version de base du site :
 * 1,25 (choix de Johann). En développement, une barre de réglage le fait varier en direct (main.js, import.meta.env.DEV).
 */
export const LOGO_CONTRAST_BASE = 1.25
export const LOGO_TUNE = { contrast: LOGO_CONTRAST_BASE }
