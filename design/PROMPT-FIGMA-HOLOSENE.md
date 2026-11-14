# Prompt pour Claude Code relié au fichier Figma HOLOSENE

À coller tel quel dans la session Claude Code qui a accès au fichier Figma (copie de travail).

---

Tu travailles sur une **copie** du fichier Figma de l'identité HOLOSENE / Johann Arata. Tu peux restructurer, renommer et supprimer librement : l'original est à l'abri. Il y a trois missions, dans cet ordre. Avant de commencer, fais un inventaire complet du fichier (pages, frames, composants, styles, variables) et montre-le-moi en une liste courte, avec ce que tu comptes garder, fusionner ou supprimer. Attends mon accord avant toute suppression en masse.

## Sources de vérité (dans le dépôt du site)

Dépôt : `/Users/johann/Documents/Projet Portfolio/Portfolio`

| Élément | Fichier | Statut |
|---|---|---|
| Monogramme S·o (tracés exacts) | `design/logo-kit/svg/monogram-*.svg`, `logo-*.svg` | référence du kit, contraste 1,0 |
| Roue irisée (couleurs, anneau 0,514) | `design/logo-kit/src/iris.js`, `tokens/iris.json`, `tokens/theme.css` | référence |
| Rendus de contrôle | `design/logo-kit/ref/*.png` | référence visuelle |
| Logotypes HOLOSENE et JOHANN ARATA (ligatures) | `public/logotypes/svg/*.svg` | référence |
| Carte d'épaisseur du S | `public/media/monogram-width.png` + `brand/tools/sdf.mjs` | sert au calcul des variantes |
| Contraste d'épaisseur validé | `src/logo-tune.js` → `LOGO_CONTRAST_BASE = 1.25` | **logo validé sur l'accueil** |

Règles absolues :
- Ne jamais redessiner, retracer ou vectoriser un logo à partir d'un PNG ou d'une capture. Toute variante part des tracés vectoriels ci-dessus.
- Ne jamais inventer de couleurs pour la roue : elles viennent de `iris.js` / `iris.json`. Dégradé conique `from 180deg`, sens horaire, cyan #22E0D8 en bas, rose #FD35A5 en haut. Rayon intérieur de l'anneau = 0,514 × rayon extérieur. Même roue en clair et en sombre.
- Fonds : clair #F6F5F2, sombre #1E1E1E (le site utilise #0D0D0D en sombre, à documenter comme usage web). Encre : #1E1E1E sur clair, blanc sur sombre.

## Mission 1 : variantes d'épaisseur du logo

Le fichier Figma ne contient que le tracé régulier du kit. Sur le site, le S est affiché avec un **contraste d'épaisseur de 1,25** : à chaque point du tracé, la demi-épaisseur locale `w` devient `w + 0,25 × (w − w̄)`, où `w̄` est la demi-épaisseur moyenne du S. Les pleins s'épaississent, les déliés s'affinent. C'est **la version validée**, elle devient le logo principal.

1. Construis les variantes en vecteur, sans passer par une image :
   - extrais la ligne médiane du S et sa demi-épaisseur le long de cette ligne (même méthode que `brand/tools/sdf.mjs`, ou calcul direct sur le tracé) ;
   - pour chaque coefficient `k`, reconstruis le contour en décalant chaque côté le long de la normale de `(k − 1) × (w − w̄)` ;
   - garde les gouttes aux extrémités et les raccords tels qu'ils sont dans le kit ; lisse le contour (pas de marches) ;
   - fais-le par script (Node ou Python), exporte en SVG, puis importe dans Figma.
   - Si une reconstruction exacte n'est pas possible pour une valeur, dis-le, ne l'approxime pas à la main.
2. Coefficients à produire : **0,85 · 1,0 (kit) · 1,25 (validé) · 1,4**. Le « o » (anneau irisé) ne change pas.
3. Garde les versions à faible contraste : elles servent aux petites tailles (favicon 16/32/48 px, icône d'app, tampon). Pour chacune, donne la taille minimale conseillée, après vérification réelle à 16, 32 et 48 px.
4. Range-les comme **variantes d'un composant** `Logo / Monogramme` avec les propriétés `Contraste` (0,85 | 1,0 | 1,25 | 1,4), `Fond` (clair | sombre) et `Couleur` (iris | mono). La valeur par défaut est `1,25 · clair · iris`.
5. Vérifie chaque variante en la superposant à `design/logo-kit/ref/*.png` (pour 1,0, l'écart doit être nul) et à une capture de l'accueil https://johann-ar.github.io/Portfolio/ (pour 1,25).

## Mission 2 : nettoyer et réorganiser le fichier

Range le fichier comme un système de marque professionnel, sans rien de superflu :

- **Pages** (dans cet ordre) :
  1. `Couverture` : nom, version, date, mode d'emploi en trois lignes.
  2. `Logo` : composant du monogramme et ses variantes, zone de protection, tailles minimales, usages interdits.
  3. `Logotypes` : HOLOSENE et JOHANN ARATA (ligatures), noir / blanc, avec les règles d'association au monogramme.
  4. `Couleur` : roue irisée (stops exacts), fonds, encres ; en variables Figma, avec modes clair et sombre.
  5. `Typographie` : polices du site (Outfit pour le texte), échelle, graisses.
  6. `Applications` : favicon, icône d'app, carte de visite, en-tête du site, réseaux.
- **Nommage** : `Catégorie / Élément / Variante`, en français et sans abréviation obscure. Pas de « Frame 123 », « Copy », « v2 final final ».
- **Composants et styles** : un seul composant par élément, des variantes plutôt que des copies, des couleurs en variables (aucune valeur codée en dur dans les calques).
- **À supprimer** : brouillons, essais, archives, doublons, calques masqués ou vides, images de travail, anciennes versions du S et du « o » (sauf les variantes d'épaisseur de la mission 1).
- **Garde seulement** les versions finales et leurs variantes utiles. En cas de doute sur un élément, mets-le dans une liste « à confirmer » au lieu de le supprimer.

Termine par un rapport : ce qui a été supprimé, fusionné, renommé, et la nouvelle arborescence.

## Mission 3 : version web du fichier

Fais une version web de la charte, plus propre, plus complète et plus interactive que Figma. Elle ne contient que les versions finales.

- Une seule page HTML autonome (ou petit site statique), sans dépendance lourde, qui marche hors ligne.
- Éléments **réels**, jamais des captures : SVG des tracés exacts, roue tracée avec les stops de `iris.js` et le tracé de `iris.glsl` / `iris-flow.js` pour l'animation (jamais de rotation globale de la roue).
- Interactions attendues :
  - curseur de **contraste d'épaisseur** du S (0,85 → 1,4), avec repère sur la valeur validée 1,25 ;
  - bascule clair / sombre, et iris / mono ;
  - aperçu à taille réelle (16, 32, 48, 180, 512 px) pour juger la lisibilité ;
  - zone de protection et tailles minimales affichées à la demande ;
  - copie en un clic des couleurs (HEX, RGB, variable CSS) ;
  - téléchargement de chaque variante en SVG et PNG (1×, 2×, 4×).
- Sections : logo, logotypes, couleur, typographie, applications, à ne pas faire.
- Accessible : contraste du texte AA, navigation au clavier, `prefers-reduced-motion` respecté.
- Fonds et encres de la mission 2, identiques au site.

Vérification avant de dire « fini » : captures (Playwright, deviceScaleFactor 2) de chaque section en clair et en sombre, et comparaison avec `design/logo-kit/ref/*.png`. Si quelque chose diffère, corrige le code, jamais la référence.
