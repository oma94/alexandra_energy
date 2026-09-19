# Alexandra Énergie

Site vitrine bilingue (EN / FR) pour Alexandra, Maître Reiki Usui : **Reiki** et
**Communication Intuitive**. Deux propositions de design à comparer.

| Version | Nom | Parti pris |
|---|---|---|
| [A](a/) | Aura | Douce et lumineuse — fond lilas, auras qui dérivent, cartes en verre dépoli |
| [C](c/) | Améthyste | La plus violette — nuit aubergine, fil d'or, mandala de lumière |

## Structure

```
index.html   page de choix entre les deux versions
a/           version A — index.html + style.css
c/           version C — index.html + style.css
shared/      commun aux deux : base.css, core.js (moteur), i18n.js (textes EN/FR), portrait
```

HTML, CSS et JavaScript purs : aucune dépendance, aucun build.

## Voir le site

En local, depuis la racine du repo :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

En ligne via GitHub Pages : *Settings → Pages → Deploy from a branch → `main` / `(root)`*.

## Modifier

- **Textes** (EN et FR) : `shared/i18n.js` — toute clé ajoutée dans une langue l'est dans l'autre.
- **Structure et comportement communs** : `shared/base.css`, `shared/core.js`.
- **Identité visuelle d'une version** : `a/style.css` ou `c/style.css`.
