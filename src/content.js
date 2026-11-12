/**
 * Contenu du site Holosene (FR / EN).
 * Règle : uniquement des informations fournies par Johann (portfolio, CV, brief). Rien d'inventé.
 * T('fr', 'en') : texte traduit. TODO('…') : à fournir par Johann, affiché seulement en mode développement (?dev).
 * Médias : chemins relatifs à public/media/. media[] : dans l'ordre contexte → détails → vue d'ensemble ; layout: 'stack'
 *   = petite case, deux 'stack' qui se suivent partagent une case double (jamais deux cases doubles d'affilée) ;
 *   ratio (facultatif) = format imposé, sinon le format le plus proche de l'image ; .mp4 = vidéo muette en boucle.
 */
export const T = (fr, en = fr) => ({ fr, en })
export const TODO = (fr, en) => ({ todo: true, fr: `[À compléter par Johann : ${fr}]`, en: `[To be completed by Johann: ${en || fr}]` })

export const site = {
  name: 'Holosene',
  person: 'Johann Arata',
  email: 'arata.johann@gmail.com',
  url: 'https://holosene.vercel.app/',
  intent: T(
    'Je capte le réel et le transforme en volumes et en espaces 3D à parcourir.',
    'I capture the real world and turn it into volumes and 3D spaces to explore.',
  ),
  baseline: T('Design interactif · WebGL · Captation du réel · Recherche en design', 'Interaction design · WebGL · Real-world capture · Design research'),
  signature: T('Portfolio de Johann Arata', 'Portfolio of Johann Arata'),
  description: T(
    'Holosene, portfolio de Johann Arata : captation du réel, nuages de points, Gaussian splatting et 3D temps réel.',
    'Holosene, Johann Arata’s portfolio: real-world capture, point clouds, Gaussian splatting and real-time 3D.',
  ),
  // CV en PDF, téléchargé depuis le bouton « Curriculum vitae » du contact : déposer le fichier à cette adresse dans public/
  cv: 'cv/johann-arata-cv.pdf',
  socials: [
    { label: 'GitHub', href: 'https://github.com/holosene' },
  ],
}

export const ui = {
  projects: T('Projets', 'Work'),
  research: T('Travaux de recherche', 'Research work'),
  studio: T('À propos', 'About'),
  workHint: T('Faites défiler', 'Scroll'),
  contact: T('Contact', 'Contact'),
  skip: T('Aller au contenu', 'Skip to content'),
  nav: T('Navigation principale', 'Main navigation'),
  langLabel: T('Read in English', 'Lire en français'),
  themeLight: T('Passer en mode clair', 'Switch to light mode'),
  themeDark: T('Passer en mode sombre', 'Switch to dark mode'),
  open: T('Voir la fiche', 'View project'),
  close: T('Fermer', 'Close'),
  specHead: T('Captation · traitement · rendu', 'Capture · processing · output'),
  copy: T('Copier l’adresse', 'Copy address'),
  cv: T('Curriculum vitae', 'Curriculum vitae'),
  copied: T('Adresse copiée', 'Address copied'),
  legal: T('Mentions légales et confidentialité', 'Legal notice and privacy'),
  lensLabel: T('Le monogramme Holosene en trame de points : le S en blanc, le « o » irisé', 'The Holosene monogram as a dot screen: the S in white, the iridescent “o”'),
  panelLabel: T('Image du projet en trame de points ; la lentille montre l’image d’origine', 'Project image as a dot screen; the lens shows the original image'),
  index: T('Projets', 'Work'),
  sections: {
    intent: T('Intention', 'Intent'),
    context: T('Contexte et milieu', 'Context and environment'),
    capture: T('Captation', 'Capture'),
    processing: T('Reconstruction et traitement', 'Reconstruction and processing'),
    staging: T('Mise en scène', 'Staging'),
    learned: T('Ce que j’ai appris, limites', 'What I learned, limits'),
    credits: T('Fiche technique', 'Fact sheet'),   // titre de la rubrique (ses lignes : rôle, outils, année, crédits)
  },
  role: T('Rôle', 'Role'),
  tools: T('Outils', 'Tools'),
  year: T('Année', 'Year'),
  creditsLabel: T('Crédits', 'Credits'),
}

export const projects = [
  {
    slug: '4derives',
    research: true,   // présenté seulement dans Recherche (avec ses essais 4DGS)
    genre: T('4D Gaussian splatting', '4D Gaussian splatting'),   // à côté du titre : l'outil ou la technique, pas une description du projet
    title: '4Dérives',
    year: '2025-26',
    milieu: T('Rivière', 'River'),
    cover: '4derives/080.webp',
    spec: [
      [T('Capteur', 'Sensor'), T('GoPro, à hauteur d’yeux', 'GoPro, at eye level')],
      [T('Reconstruction', 'Reconstruction'), T('4D Gaussian splatting', '4D Gaussian splatting')],
      [T('Rendu', 'Output'), T('Film, essais 4D', 'Film, 4D tests')],
    ],
    intent: TODO('l’intention du projet en une phrase', 'the project’s intent in one sentence'),
    context: T(
      'Une descente de rivière filmée en GoPro à hauteur d’yeux, en trois saisons : automne, hiver, printemps.',
      'A river descent filmed on a GoPro at eye level, across three seasons: autumn, winter, spring.',
    ),
    capture: T('Tournage par Johann, en GoPro à hauteur d’yeux, sur trois saisons.', 'Shot by Johann on a GoPro at eye level, across three seasons.'),
    processing: T(
      'Essais en 4D Gaussian splatting (Luma AI) à partir du tournage, pour prolonger l’espace hors du cadre.',
      'Tests in 4D Gaussian splatting (Luma AI) from the footage, to extend the space beyond the frame.',
    ),
    staging: T('Un film : l’étalonnage, la musique et le rythme font les variations entre les saisons.', 'A film: grading, music and pace carry the changes between seasons.'),
    learned: T('Les essais en 4D Gaussian splatting montrent les limites des outils accessibles aujourd’hui.', 'The 4D Gaussian splatting tests show the limits of today’s accessible tools.'),
    role: TODO('ton rôle (seul ? avec qui ?)', 'your role'),
    tools: 'GoPro, DaVinci Resolve, Luma AI',
    credits: [TODO('auteur de la musique', 'music credit')],
    link: { label: T('Voir le film', 'Watch the film'), href: 'https://www.youtube.com/watch?v=1lXEIx5jFCQ' },
    media: [
      // contexte (le film), puis le traitement en 4D, puis le rendu d'ensemble
      { src: '4derives/084.webp', alt: T('Image d’ouverture du film 4Dérives', 'Opening still of 4Dérives') },
      { src: '4derives/080.webp', alt: T('Image du film, automne', 'Still from the film, autumn') },
      { src: '4derives/082.webp', alt: T('Image du film, printemps', 'Still from the film, spring'), layout: 'stack' },
      { src: '4derives/078.webp', alt: T('Image du film, hiver', 'Still from the film, winter'), layout: 'stack' },
      { src: '4derives/086.webp', alt: T('Image après traitement', 'Processed image') },
      { src: '4derives/073.webp', alt: T('Mouvement de caméra dans un volume 4D', 'Camera move inside a 4D volume') },
      { src: '4derives/075.webp', alt: T('Essai 4D Shape of Motion', '4D Shape of Motion test'), layout: 'stack' },
      { src: '4derives/067.webp', alt: T('Le volume 4D dans SuperSplat', 'The 4D volume in SuperSplat'), layout: 'stack' },
      { src: '4derives/077.webp', alt: T('Rendu 3D Luma AI', 'Luma AI 3D render'), ratio: 2.4 },
    ],
  },
  {
    slug: 'dumbo',
    genre: T('WebGL, IA SAM2', 'WebGL, SAM2 AI'),   // à côté du titre : l'outil ou la technique, pas une description du projet
    title: 'Dumbo',
    year: '2026',
    milieu: T('Grands fonds', 'Deep sea'),
    cover: 'dumbo/058.webp',
    coverCredit: T('Rendu : Johann Arata, d’après des vidéos du Schmidt Ocean Institute', 'Render: Johann Arata, from Schmidt Ocean Institute footage'),
    spec: [
      [T('Source', 'Source'), T('Vidéos de submersibles (Schmidt Ocean Institute)', 'Submersible footage (Schmidt Ocean Institute)')],
      [T('Traitement', 'Processing'), T('Segmentation IA (SAM2), profondeur par luminosité', 'AI segmentation (SAM2), depth from brightness')],
      [T('Rendu', 'Output'), T('Galerie 3D temps réel', 'Real-time 3D gallery')],
    ],
    intent: TODO('l’intention du projet en une phrase', 'the project’s intent in one sentence'),
    context: T(
      'Des vidéos de grands fonds deviennent des volumes à parcourir, pour approcher une créature abyssale comme une sculpture.',
      'Deep-sea footage turned into volumes to walk around, to approach a deep-sea creature like a sculpture.',
    ),
    capture: T('Pas de captation propre : vidéos de submersibles du Schmidt Ocean Institute.', 'No own capture: submersible footage from the Schmidt Ocean Institute.'),
    processing: T(
      'Une IA de segmentation (SAM2) isole les créatures ; la luminosité de chaque pixel lui donne sa profondeur, comme une carte de profondeur. Ce n’est pas une reconstruction 3D mesurée.',
      'A segmentation AI (SAM2) isolates the creatures; the brightness of each pixel sets its depth, like a depth map. This is not a measured 3D reconstruction.',
    ),
    staging: T('Une galerie parcourue à la première personne, en Three.js et WebGL.', 'A first-person gallery, built in Three.js and WebGL.'),
    learned: TODO('ce que tu as appris, les limites', 'what you learned, the limits'),
    role: TODO('ton rôle', 'your role'),
    tools: 'Three.js, WebGL, SAM2',
    credits: [T('Vidéos : Schmidt Ocean Institute', 'Footage: Schmidt Ocean Institute'), TODO('mention exacte exigée par la licence du Schmidt Ocean Institute', 'exact licence wording')],
    link: { label: T('Ouvrir le projet', 'Open the project'), href: 'https://holosene.github.io/dumbo-biovolume/' },
    media: [
      // contexte (l'espace), puis la mise en volume, puis la galerie d'ensemble
      { src: 'dumbo/056.webp', alt: T('L’espace Dumbo, l’entrée', 'The Dumbo space, the entrance') },
      { src: 'dumbo/057.webp', alt: T('L’espace Dumbo, près d’un mur', 'The Dumbo space, close to a wall') },
      { src: 'dumbo/041.webp', alt: T('L’IA isole le sujet de l’image', 'AI isolating the subject'), layout: 'stack' },
      { src: 'dumbo/053.webp', alt: T('La vidéo source mise en volume', 'The source footage turned into a volume'), layout: 'stack' },
      { src: 'dumbo/058.webp', alt: T('Volume créé à partir d’une vidéo de submersible', 'Volume built from submersible footage') },
      { src: 'dumbo/054.webp', alt: T('Le volume vu de côté', 'The volume seen from the side') },
      { src: 'dumbo/061.webp', alt: T('Volume d’une créature', 'Volume of a creature'), layout: 'stack' },
      { src: 'dumbo/048.webp', alt: T('Volume d’un animal marin', 'Volume of a sea creature'), layout: 'stack' },
      { src: 'dumbo/052.webp', alt: T('Galerie de volumes', 'Gallery of volumes'), ratio: 2.2 },
    ],
  },
  {
    slug: 'photographique-volume',
    genre: T('WebGL, Depth Anything', 'WebGL, Depth Anything'),   // à côté du titre : l'outil ou la technique, pas une description du projet
    title: 'Photographique Volume',
    year: '2025-26',
    milieu: T('Littoral', 'Coastline'),
    cover: 'photographique-volume/vignette.webp',
    coverCredit: T('Rendu : Johann Arata, d’après les photographies de Nicolas Floc’h', 'Render: Johann Arata, from Nicolas Floc’h’s photographs'),
    spec: [
      [T('Source', 'Source'), T('Photographies de Nicolas Floc’h', 'Photographs by Nicolas Floc’h')],
      [T('Traitement', 'Processing'), T('Profondeur estimée par IA (Depth Anything V2)', 'AI-estimated depth (Depth Anything V2)')],
      [T('Rendu', 'Output'), T('Paysages 3D, son (Web Audio)', '3D landscapes, sound (Web Audio)')],
    ],
    intent: TODO('l’intention du projet en une phrase', 'the project’s intent in one sentence'),
    context: T(
      'Les photographies sous-marines de Nicolas Floc’h, prises dans les Calanques, deviennent des paysages 3D. Sept images, du rivage vers le large.',
      'Nicolas Floc’h’s underwater photographs of the Calanques turned into 3D landscapes. Seven images, from the shore out to the open sea.',
    ),
    capture: T('Pas de captation propre : photographies de Nicolas Floc’h (Calanques, 2018-2020), séries « Invisible » et « La Couleur de l’eau ».', 'No own capture: photographs by Nicolas Floc’h (Calanques, 2018-2020), series “Invisible” and “La Couleur de l’eau”.'),
    processing: T(
      'La profondeur est estimée par IA (Depth Anything V2), puis affinée par la lumière de l’image. « Invisible » donne la forme, « La Couleur de l’eau » la couleur.',
      'Depth is estimated by AI (Depth Anything V2), then refined by the light in the image. “Invisible” gives the shape, “La Couleur de l’eau” the colour.',
    ),
    staging: T('Sept paysages 3D parcourus du rivage vers le large, accompagnés de son (Web Audio).', 'Seven 3D landscapes, from the shore to the open sea, with sound (Web Audio).'),
    learned: TODO('ce que tu as appris, les limites', 'what you learned, the limits'),
    role: TODO('ton rôle', 'your role'),
    tools: 'Three.js, WebGL, Web Audio, Depth Anything V2',
    credits: [T('Photographies © Nicolas Floc’h', 'Photographs © Nicolas Floc’h')],
    link: { label: T('Ouvrir le projet', 'Open the project'), href: 'https://holosene.github.io/photographique-volume' },
    media: [
      // contexte (le site), puis les états et la profondeur, puis la salle d'exposition
      { src: 'photographique-volume/034.webp', alt: T('Le site web', 'The website') },
      { src: 'photographique-volume/029.webp', alt: T('Volume photographique, état 01', 'Photographic volume, state 01') },
      { src: 'photographique-volume/030.webp', alt: T('Volume photographique, état 03', 'Photographic volume, state 03'), layout: 'stack' },
      { src: 'photographique-volume/031.webp', alt: T('Volume photographique, état 07', 'Photographic volume, state 07'), layout: 'stack' },
      { src: 'photographique-volume/028.webp', alt: T('Profondeur estimée par IA et par la lumière', 'Depth estimated by AI and from light') },
      { src: 'photographique-volume/018.webp', alt: T('Volume photographique, éclatement', 'Photographic volume, burst') },
      { src: 'photographique-volume/017.webp', alt: T('Prototype : bloc photographique', 'Prototype: photographic block'), layout: 'stack' },
      { src: 'photographique-volume/027.webp', alt: T('Carte de profondeur', 'Depth map'), layout: 'stack' },
      { src: 'photographique-volume/036.webp', alt: T('Test de projection dans une salle d’exposition 3D', 'Projection test in a 3D exhibition room') },
    ],
  },
  {
    slug: 'duo-news',
    genre: T('UI design, Figma', 'UI design, Figma'),   // à côté du titre : l'outil ou la technique, pas une description du projet
    title: 'Duo News',
    year: '2026',
    milieu: T('Presse numérique', 'Digital press'),
    cover: 'duo-news/vignette.webp',
    coverMobile: 'duo-news/vignette-mobile.webp',   // vignette carrée (mobile) : l'image de couverture seule
    coverDark: 'duo-news/vignette-sombre.webp', coverMobileDark: 'duo-news/vignette-mobile-sombre.webp',   // mode sombre : même image, fond sombre
    spec: [
      [T('Support', 'Device'), T('iPhone Duo, écran pliable : ouvert en double page, fermé en une page', 'iPhone Duo, foldable screen: open as a double page, closed as a single page')],
      [T('Contenu', 'Content'), T('Sources RSS d’actualité locales, réglables', 'Local RSS news sources, user-selectable')],
      [T('Rendu', 'Output'), T('Prototype de démonstration Figma', 'Figma demo prototype')],
    ],
    intent: T('Un journal qui rassemble les sources RSS d’actualité, voulu pour l’iPhone Duo.', 'A newspaper that gathers RSS news sources, designed for the iPhone Duo.'),
    context: T(
      'Projet de Master Design, Environnements numériques (Université de Strasbourg, octobre 2026). Une édition quotidienne qui reprend les codes de la presse papier.',
      'Master’s project in Design, Digital Environments (University of Strasbourg, October 2026). A daily edition that borrows the codes of print newspapers.',
    ),
    capture: T('L’écran intérieur de l’iPhone Duo : OLED pliable 7,6 pouces, 1878 × 2670 px. Fermé, il prend un format passeport.', 'The iPhone Duo inner screen: 7.6-inch foldable OLED, 1878 × 2670 px. Closed, it is passport-sized.'),
    processing: T('Trois familles de caractères, onze styles de texte appliqués à tous les composants ; Hubot Sans ExtraBold pour les gros titres, dans l’esprit des unes de presse.', 'Three typefaces, eleven text styles applied to every component; Hubot Sans ExtraBold for headlines, in the spirit of newspaper front pages.'),
    staging: T('Un prototype en deux parcours, journal ouvert et journal fermé : accueil, réglages des sources, pages d’articles, fin de l’édition.', 'A prototype with two flows, open and closed: home, source settings, article pages, end of the edition.'),
    learned: TODO('ce que tu as appris, les limites', 'what you learned, the limits'),
    role: TODO('ton rôle', 'your role'),
    tools: 'Figma',
    credits: [],
    media: [
      // contexte (en main, le parcours ouvert), puis le système (grille, images, typo, couleurs), puis le parcours fermé ;
      // dark / posterDark : la même image sur fond sombre, montrée en mode sombre (main.js)
      { src: 'duo-news/main-prototype.webp', dark: 'duo-news/main-prototype-sombre.webp', alt: T('Le journal Duo News tenu en main, iPhone Duo fermé', 'Duo News held in hand, iPhone Duo closed') },
      { src: 'duo-news/mains-ouvert.webp', alt: T('Le journal ouvert en double page sur un iPhone Duo tenu à deux mains', 'The newspaper open as a double page on an iPhone Duo held in both hands') },
      { src: 'duo-news/duo-news-ouvert.mp4', poster: 'duo-news/duo-news-ouvert-poster.webp', dark: 'duo-news/duo-news-ouvert-sombre.mp4', posterDark: 'duo-news/duo-news-ouvert-sombre-poster.webp', alt: T('Parcours du journal ouvert, de l’accueil à la fin de l’édition', 'Open newspaper flow, from home to the end of the edition') },
      { src: 'duo-news/ouvert-une.webp', dark: 'duo-news/ouvert-une-sombre.webp', alt: T('Le journal ouvert en double page', 'The newspaper open as a double page'), layout: 'stack' },
      { src: 'duo-news/ferme-trio.webp', dark: 'duo-news/ferme-trio-sombre.webp', alt: T('Trois pages du journal fermé', 'Three pages of the closed newspaper'), layout: 'stack' },
      { src: 'duo-news/la-grille.webp', dark: 'duo-news/la-grille-sombre.webp', alt: T('La grille : 6 colonnes, ligne de base de 16 px', 'The grid: 6 columns, 16 px baseline') },
      { src: 'duo-news/traitement-des-images.webp', dark: 'duo-news/traitement-des-images-sombre.webp', alt: T('Le traitement des images en trichromie', 'Image processing in trichromy') },
      { src: 'duo-news/les-styles-de-texte.webp', dark: 'duo-news/les-styles-de-texte-sombre.webp', alt: T('Les styles de texte : trois familles, onze styles', 'Text styles: three typefaces, eleven styles'), layout: 'stack' },
      { src: 'duo-news/les-couleurs.webp', dark: 'duo-news/les-couleurs-sombre.webp', alt: T('Les couleurs : trois thèmes, clair, confort et sombre', 'Colours: three themes, light, comfort and dark'), layout: 'stack' },
      { src: 'duo-news/duo-news-ferme.mp4', poster: 'duo-news/duo-news-ferme-poster.webp', dark: 'duo-news/duo-news-ferme-sombre.mp4', posterDark: 'duo-news/duo-news-ferme-sombre-poster.webp', alt: T('Parcours du journal fermé, page par page', 'Closed newspaper flow, page by page') },
    ],
  },
  {
    slug: 'voyageur-1',
    genre: T('WebGL 2', 'WebGL 2'),   // à côté du titre : l'outil ou la technique, pas une description du projet
    title: 'Voyageur 1',
    year: '2026',
    milieu: T('Espace', 'Space'),
    cover: 'voyageur-1/vignette.webp',
    coverMobile: 'voyageur-1/vignette-mobile.webp',
    coverCredit: T('Images du disque : NASA / JPL ; décodage : Ron Barry (2017)', 'Record images: NASA / JPL; decoding: Ron Barry (2017)'),
    spec: [
      [T('Source', 'Source'), T('Les 116 images du disque d’or (1977)', 'The 116 images of the Golden Record (1977)')],
      [T('Traitement', 'Processing'), T('Simulation du signal sonore, calibrée sur les images NASA', 'Audio signal simulation, calibrated on NASA images')],
      [T('Rendu', 'Output'), T('Splats gaussiens en WebGL 2', 'Gaussian splats in WebGL 2')],
    ],
    intent: T(
      'Faire découvrir les 116 images du disque d’or de Voyager, chacune en volume.',
      'An introduction to the 116 images of the Voyager Golden Record, each one in volume.',
    ),
    context: T(
      'En 1977, les images du disque ont été gravées dans le sillon sous forme de son. Décodées en 2017, elles en gardent les traces : stries, trames, pertes.',
      'In 1977, the record’s images were cut into the groove as sound. Decoded in 2017, they still carry its marks: streaks, scan lines, losses.',
    ),
    capture: T('Un récit en photos d’archives NASA mène jusqu’au disque, qui tourne entouré de ses images.', 'A story in NASA archive photos leads to the record, spinning among its images.'),
    processing: T(
      'Chaque image se reforme en gaussiennes, étirées le long des traces du signal et détachées là où il l’a abîmée.',
      'Each image re-forms as Gaussians, stretched along the signal’s scan lines and pulled apart where it damaged them.',
    ),
    staging: T('Un site WebGL 2 sans bibliothèque, accompagné des sons du disque.', 'A library-free WebGL 2 site, set to the record’s sounds.'),
    learned: TODO('ce que tu as appris, les limites', 'what you learned, the limits'),
    role: TODO('ton rôle', 'your role'),
    tools: 'WebGL 2, TypeScript, Vite, Web Audio',
    credits: [
      T('Voyager Golden Record (1977) : NASA / JPL', 'Voyager Golden Record (1977): NASA / JPL'),
      T('Décodage des images : Ron Barry (2017)', 'Image decoding: Ron Barry (2017)'),
      T('Photos d’archives : NASA / JPL-Caltech, NASA / KSC', 'Archive photos: NASA / JPL-Caltech, NASA / KSC'),
      T('Projet indépendant, ni produit ni approuvé par la NASA', 'Independent project, not produced or endorsed by NASA'),
    ],
    link: { label: T('Voir le code', 'View the code'), href: 'https://github.com/Johann-Ar/Voyageur-1' },
    media: [
      // ordre de l'expérience : l'accueil, le récit, le disque et ses images, une image en volume, la galerie
      { src: 'voyageur-1/accueil.webp', alt: T('L’accueil du site', 'The site’s home screen') },
      { src: 'voyageur-1/voyageur-recit.mp4', poster: 'voyageur-1/voyageur-recit-poster.webp', alt: T('Le récit en photos d’archives NASA', 'The story in NASA archive photos') },
      { src: 'voyageur-1/recit-2.webp', alt: T('Le récit : le disque fixé sur la sonde', 'The story: the record fixed to the probe'), layout: 'stack' },
      { src: 'voyageur-1/disque.webp', alt: T('Le disque d’or entouré de ses images', 'The Golden Record surrounded by its images'), layout: 'stack' },
      { src: 'voyageur-1/voyageur-disque.mp4', poster: 'voyageur-1/voyageur-disque-poster.webp', alt: T('Le disque tourne au glisser', 'Dragging spins the record') },
      { src: 'voyageur-1/voyageur-volume.mp4', poster: 'voyageur-1/voyageur-volume-poster.webp', alt: T('Une image se reforme en volume, puis tourne', 'An image re-forms in volume, then turns') },
      { src: 'voyageur-1/galerie.webp', alt: T('La galerie des 116 images', 'The gallery of 116 images') },
    ],
  },
  {
    slug: 'mondes-immerges',
    research: true,   // présenté seulement dans Recherche
    genre: T('Édition, InDesign', 'Editorial design, InDesign'),   // à côté du titre : l'outil ou la technique, pas une description du projet
    title: 'Mondes Immergés',
    year: '2024-25',
    milieu: T('Recherche', 'Research'),
    cover: 'mondes-immerges/011.webp',
    spec: [
      [T('Forme', 'Format'), T('Article de recherche édité', 'Published research paper')],
      [T('Sujet', 'Subject'), T('Design immersif et milieux aquatiques', 'Immersive design and aquatic environments')],
      [T('Cadre', 'Context'), T('DNMADe Design numérique', 'DNMADe in Digital Design')],
    ],
    intent: T(
      'Comment le design immersif peut-il rendre sensibles des milieux aquatiques qui se dégradent ?',
      'How can immersive design make damaged aquatic environments felt?',
    ),
    context: T(
      'Article de recherche de DNMADe (René Goscinny). Il croise écologie et représentation visuelle et pose les bases des projets qui ont suivi.',
      'Research paper written during my design degree (René Goscinny). It brings ecology and visual representation together and laid the groundwork for the projects that followed.',
    ),
    capture: T('Sources documentaires et scientifiques.', 'Documentary and scientific sources.'),
    processing: T('Analyse de dispositifs existants et expérimentations graphiques.', 'Review of existing works and graphic experiments.'),
    staging: T('Un article édité, mis en page et imprimé.', 'An edited, designed and printed paper.'),
    learned: TODO('ce que tu en retiens', 'what you take from it'),
    role: TODO('ton rôle', 'your role'),
    tools: 'InDesign, Photoshop, Illustrator',
    credits: [],
    link: { label: T('Lire l’article', 'Read the paper'), href: 'https://indd.adobe.com/view/dc3c7dff-f28e-4969-9c00-527dc66c4321' },
    media: [
      // contexte (le livre en main), puis les expérimentations, puis le livre à feuilleter
      { src: 'mondes-immerges/012.webp', alt: T('Expérimentation en volume', 'Volume experiment') },
      { src: 'mondes-immerges/013.webp', alt: T('Page d’ouverture', 'Opening spread') },
      { src: 'mondes-immerges/009.webp', alt: T('Aurores boréales transformées en particules', 'Northern lights turned into particles'), layout: 'stack' },
      { src: 'mondes-immerges/005.webp', alt: T('Motif génératif', 'Generative pattern'), layout: 'stack' },
      { src: 'mondes-immerges/010.webp', alt: T('Expérimentation graphique', 'Graphic experiment') },
      { book: 'mondes-immerges/livre', pages: 130, ratio: 1004 / 1400, poster: 'mondes-immerges/011.webp', alt: T('Le livre Mondes Immergés à feuilleter', 'The Mondes Immergés book, to leaf through') },
    ],
  },
]

/** Recherche : le profil de chercheur, au-delà des projets. Uniquement des éléments fournis par Johann. */
/** Projets choisis : courte présentation de la section. */
export const workIntro = T(
  'Une sélection de projets où le réel capté devient volume, image ou espace à parcourir, de la rivière aux grands fonds jusqu’au littoral.',
  'A selection of projects where captured reality becomes volume, image or space to explore, from the river to the deep sea and the coastline.',
)

export const research = {
  intro: T(
    'Mon mémoire porte sur la reconstruction volumétrique du réel capturé (Gaussian splatting 3D et 4D) et sur la frontière entre captation, reconstruction et génération par IA.',
    'My thesis looks at the volumetric reconstruction of captured reality (3D and 4D Gaussian splatting) and at the line between capture, reconstruction and AI generation.',
  ),
  items: [
    {
      kind: T('Mémoire de master', 'Master’s thesis'), when: T('En cours', 'In progress'),
      title: T('Reconstruction volumétrique du réel capturé', 'Volumetric reconstruction of captured reality'),
      text: T('Gaussian splatting 3D et 4D ; ce qui sépare captation, reconstruction et génération par IA.', '3D and 4D Gaussian splatting; what separates capture, reconstruction and AI generation.'),
      more: TODO('titre du mémoire, direction, échéance', 'thesis title, supervisor, deadline'),
      image: 'en-cours.webp', label: T('En cours', 'In progress'),   // dégradé tramé ; texte net dessiné par le WebGL
    },
    {
      // 4Dérives et les essais 4DGS : un seul travail (le film et ses essais en 4D Gaussian splatting)
      kind: T('Film et 4D Gaussian splatting', 'Film and 4D Gaussian splatting'), when: '2025-26',
      title: T('4Dérives', '4Dérives'),
      text: T('Une descente de rivière filmée en GoPro sur trois saisons, et ses essais en 4D Gaussian splatting (Luma AI) qui prolongent l’espace hors du cadre. Ils montrent les limites des outils accessibles aujourd’hui.', 'A river descent filmed on a GoPro across three seasons, and its 4D Gaussian splatting tests (Luma AI) that extend the space beyond the frame. They show the limits of today’s accessible tools.'),
      slug: '4derives', image: '4derives/080.webp', alt: T('4Dérives, la rivière filmée en GoPro', '4Dérives, the river filmed on a GoPro'),
      href: '#p-4derives',
    },
    {
      kind: T('Article de recherche', 'Research paper'), when: '2024-25',
      title: T('Mondes Immergés', 'Mondes Immergés'),
      text: T('Comment le design immersif peut-il rendre sensibles des milieux aquatiques qui se dégradent ? Article édité pendant le DNMADe.', 'How can immersive design make damaged aquatic environments felt? A paper published during my design degree.'),
      slug: 'mondes-immerges', image: 'mondes-immerges/011.webp', pos: [0.5, 0.12], alt: T('Couverture du livre Mondes Immergés', 'Cover of Mondes Immergés'),
      href: '#p-mondes-immerges',
    },
    {
      todo: true,
      kind: TODO('autre recherche personnelle (texte, expérimentation, communication…)', 'other personal research'), when: '',
      title: TODO('titre', 'title'), text: TODO('une ou deux phrases', 'one or two sentences'),
    },
  ],
}

/** Mini à propos sous le logotype (une phrase). */
export const studio = T(
  'Designer numérique : design interactif, WebGL, captation du réel et recherche en design.',
  'Digital designer: interaction design, WebGL, real-world capture and design research.',
)

/** À propos, en fin de page. **…** : mots mis en avant. Uniquement des informations fournies par Johann. */
export const about = [
  T('Je suis designer numérique, en **master Design (Environnements numériques)** à la Faculté des arts de Strasbourg, après un **DNMADe Design numérique**.',
    'I am a digital designer, studying for a **master’s in Design (Digital Environments)** at the Faculty of Arts in Strasbourg, after a **degree in Digital Design (DNMADe)**.'),
  T('Je capte le réel et je le transforme en **volumes et en espaces 3D à parcourir**, de la prise de vue jusqu’au site en **WebGL et Three.js**.',
    'I capture the real world and turn it into **volumes and 3D spaces to explore**, from the shoot to the website in **WebGL and Three.js**.'),
  T('En parallèle des projets, je mène une **recherche en design** sur le réel capturé et sur ce qui le sépare de la **génération par IA**.',
    'Alongside the projects, I carry out **design research** on captured reality and on what separates it from **AI generation**.'),
]
