# Portfolio Nambinintsoa

Site vitrine personnel présentant mon expérience auprès des enfants, ma routine quotidienne, mes activités et mes disponibilités comme garçon au pair en Belgique.

## Démo en ligne

À compléter après la publication du site, par exemple avec GitHub Pages.

## Stack technique

- HTML5 sémantique
- CSS3 responsive : Grid, Flexbox, variables et animations légères
- JavaScript natif, sans framework ni dépendance de production
- Portfolio disponible en français, en anglais et en allemand
- Images servies en WebP avec repli JPEG et dimensions réservées pour limiter le décalage de mise en page
- Polices DM Sans et Playfair Display via Google Fonts

## Structure du projet

```text
portfolio-nambinintsoa/
├── index.html
├── README.md
├── .gitignore
└── assets/
    ├── documents/
    │   ├── Nambinintsoa-CV.pdf
    │   ├── Nambinintsoa CV.pdf
    │   ├── Nambinintsoa LM.pdf
    │   └── My daily routines.pdf
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── main.js
    │   ├── translations.js
    │   └── main.test.js
    └── images/
        ├── favicon.svg
        ├── portrait-nambinintsoa.jpeg
        ├── portrait-nambinintsoa.webp
        ├── family-play.jpeg
        ├── family-play.webp
        ├── board-game.jpeg
        ├── board-game.webp
        ├── free-play.jpeg
        ├── free-play.webp
        ├── outdoor-discovery.jpeg
        ├── outdoor-discovery.webp
        ├── building-blocks.jpeg
        └── building-blocks.webp
```

## Organisation du code

- `index.html` contient la structure sémantique et le contenu du site.
- `assets/css/styles.css` regroupe le thème, les composants et les adaptations mobiles.
- `assets/js/main.js` gère les interactions; les mises à jour liées au défilement sont regroupées avec `requestAnimationFrame`.
- `assets/js/translations.js` contient les traductions anglaises et allemandes, le français étant la langue source du HTML.
- `assets/js/main.test.js` vérifie les interactions et les traductions avec le module natif `node:test`.
- À chaque ouverture, une fenêtre modale demande de choisir le français, l’anglais ou l’allemand avant d’accéder à l’accueil. La langue peut ensuite être modifiée dans la navigation.

Les fichiers PDF ont été déplacés de `PDF/` vers `assets/documents/`. Tout fichier placé dans `assets/documents/` sera publié avec le site. Le bouton de la section « À propos » ouvre `Nambinintsoa-CV.pdf`.

## Lancer le site en local

Le portfolio ne nécessite ni installation ni compilation. Depuis le dossier du projet, démarrez un serveur statique :

```bash
python -m http.server 8000
```

Ouvrez ensuite <http://localhost:8000> dans votre navigateur. Vous pouvez aussi ouvrir `index.html` directement ou utiliser l’extension Live Server de VS Code.

## Exécuter les tests

Les tests utilisent le module natif `node:test` et ne nécessitent aucune dépendance :

```bash
node --test assets/js/main.test.js
```

## Chemins des fichiers

Les chemins sont relatifs à `index.html` :

```html
<link rel="icon" href="assets/images/favicon.svg">
<link rel="stylesheet" href="assets/css/styles.css">
<img src="assets/images/portrait-nambinintsoa.jpeg" alt="Portrait de Nambinintsoa">
<script src="assets/js/main.js"></script>
```

Dans `assets/css/styles.css`, les chemins d’images sont relatifs au fichier CSS. Pour utiliser `assets/images/fond.jpg`, écrivez :

```css
background-image: url("../images/fond.jpg");
```

## Ajouter ou remplacer une image

Utilisez des noms descriptifs en minuscules, sans espaces ni accents, séparés par des tirets, par exemple `atelier-creatif.jpeg`. Placez l’image dans `assets/images/`, puis mettez à jour son chemin dans `index.html` ou `assets/css/styles.css`.

Pour les photos de la galerie et le portrait, `index.html` privilégie le fichier WebP et conserve le JPEG comme solution de repli. Lorsqu’une photo est remplacée, mettez à jour les deux sources ainsi que les dimensions et le texte alternatif.

## Publication

Le dépôt GitHub à créer s’appelle `portfolio-nambinintsoa`. Le site peut être hébergé gratuitement avec GitHub Pages ou sur tout hébergeur de site statique. Publiez le contenu du projet en gardant la structure des dossiers. Le dossier `PDF/` reste exclu par `.gitignore`.

Après avoir activé GitHub Pages sur la branche `main` et le dossier `/ (root)`, l’adresse du site sera :

```text
https://VOTRE-NOM.github.io/portfolio-nambinintsoa/
```
