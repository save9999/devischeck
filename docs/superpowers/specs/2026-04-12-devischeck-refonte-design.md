# DevisCheck — Refonte analyse fiable multi-pièces

**Date** : 2026-04-12
**Statut** : Spec validé — en attente de relecture utilisateur
**Projet** : `/Users/superbot/devischeck` (SPA React 19 + Vite, déployé sur `devischeck.vercel.app`)

## Contexte et motivation

L'application DevisCheck permet aux particuliers de vérifier un devis BTP en uploadant le PDF. La version actuelle présente plusieurs limitations critiques :

1. **Extraction regex fragile** — `pdfExtractor.js` exige un numéro de ligne 1-99 en début de ligne. Les devis mal formatés sont ignorés silencieusement, des lignes peuvent être perdues.
2. **Bug structurel dans l'analyseur** — `priceAnalyzer.js` somme systématiquement `mat_moy + mo_moy`, sans distinguer "fourniture seule", "pose seule", "fourniture et pose". Conséquence : un devis de pose pure est affiché avec un écart artificiellement énorme.
3. **Mono-pièce** — Seule la salle de bain est supportée dans `prixBTP.json`.
4. **Saisie manuelle obligatoire** — L'utilisateur doit ressaisir longueur/largeur/hauteur alors que ces données sont souvent présentes dans le devis.
5. **Localisation figée** — Prix IDF uniquement, pas de coefficient régional.
6. **Multi-pages non garanti** — Le parseur regex traite les pages mais la logique de dédup par `numero-montant` peut absorber des lignes légitimes de pages différentes.

**Objectif de cette refonte** : fournir une analyse la plus fiable possible — en toute transparence sur les limites — en couvrant tous les types de pièces, en détectant automatiquement les informations du devis, en distinguant rigoureusement fourniture/pose, et en appliquant un coefficient régional.

**Note de réalisme** : "fiable à 100%" n'existe pas dans le BTP. Même les bases pro (Batiprix) affichent ±10-15%. Le parti-pris de cette refonte est d'être **orientée anomalies** plutôt que "prix exact" : on signale ce qui sort du marché avec explication, on ne prétend pas certifier un prix unique.

## Décisions d'architecture

| Sujet | Choix | Motivation |
|---|---|---|
| Extraction | Hybride : PDF.js pour texte brut, puis Claude API pour structuration | La regex actuelle est structurellement incapable de fiabilité. Claude lit le devis comme un humain, multi-page sans perte. |
| Backend | Vercel Function `api/analyze-devis.js` | Zero-config, protège la clé `ANTHROPIC_API_KEY`, reste compatible avec le SPA Vite existant (pas de migration Next.js) |
| Localisation | Coefficient régional par code postal | Simple, prévisible, auditable. Approche standard en BTP. |
| Code postal | Extrait automatiquement par Claude depuis le PDF, éditable | Cohérent avec l'objectif "rien à ressaisir" |
| Types de pièces | Complet : sdb, cuisine, salon, chambre, WC, entrée, toiture, façade | Couvre la quasi-totalité des devis résidentiels |
| Base prix | Claude-generated + relecture manuelle + disclaimer ±15% + script de régénération | Seule option légale et maintenable. Scraping Batiprix/ArtiPrix exclu (ToS + risque juridique art. 323-3 CP / L342-1 CPI). |
| Output | Orienté anomalies, pas "prix exact" | Plus honnête, plus utile, aligné sur les pratiques du marché (Habitatpresto, Travauxlib). |

## Architecture — data flow

```
UploadZone
    │ File → ArrayBuffer
    ▼
pdfExtractor.extractPdfText(file)
    │ { pages: string[], fullText: string }
    ▼
fetch('/api/analyze-devis', { body: { fullText } })
    │
    ▼
api/analyze-devis.js (Vercel Function, Node)
    │ Anthropic SDK → claude-sonnet-4-5
    │ prompt structuré (api/_prompt.js)
    ▼
Réponse JSON structurée :
{
  codePostal, ville,
  pieces: [{ id, type, nom, dimensions?, surfaces?, lineIds }],
  lines: [{ numero, designation, quantite, unite, prixUnitaire, montantHT,
            typePrestation, poste, pieceId, confidence }],
  totalHT, warnings
}

Où `poste` est un chemin résolvable dans prixBTP.json, ex :
  "postes_transverses.peinture.peinture_murs_2couches"
  "postes_transverses.carrelage.sol_gres_cerame"
  "pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard"
  "pieces.cuisine.postes_specifiques.meubles.meuble_bas_standard"

Règle de placement : un poste dont le prix ne varie pas selon le type
de pièce va dans `postes_transverses` (peinture, carrelage, électricité
générique, placo). Un poste spécifique à un type de pièce va dans
`pieces[type].postes_specifiques` (receveur de douche → sdb, plan de
travail → cuisine, zinguerie → toiture).
Le prompt Claude reçoit la liste des postes disponibles et doit
choisir le chemin exact correspondant à la ligne. Si aucun ne
correspond, `poste: null` et `confidence: 0.3` → ligne classée `unknown`.
    │
    ▼
priceAnalyzer.analyze(extraction, coefficientRegional)
    │ Pour chaque ligne :
    │   - Résout le chemin `line.poste` dans prixBTP.json
    │   - Selon typePrestation : compare mat_moy / mo_moy / mat_moy+mo_moy
    │   - Applique coefficient régional
    │   - Calcule écart vs fourchette min-max
    │   - Classe : ok | warn | bad | low | unknown
    ▼
AnalysisReport (UI orientée anomalies)

Recalcul après édition dans `DetectedInfo` :
L'état React conserve à la fois `extraction` (réponse Claude brute,
immuable sauf édition manuelle) et `analysis` (résultat de
`priceAnalyzer`). Cliquer "Recalculer" après édition du code postal
ou des dimensions ré-exécute `priceAnalyzer.analyze(extractionModifiée,
newCoefficient)` côté client — pas de nouvel appel à l'API Claude.
L'appel Claude n'est refait que si l'utilisateur re-upload un PDF.
```

## Modifications de fichiers

### Nouveaux fichiers

- `api/analyze-devis.js` — Vercel Function, handler Node qui appelle Anthropic SDK
- `api/_prompt.js` — template du prompt d'extraction (versionné, unit-testable)
- `scripts/generatePrixBTP.js` — script one-shot `node scripts/generatePrixBTP.js` pour régénérer `prixBTP.json` via Claude
- `src/components/DetectedInfo.jsx` — carte affichant les infos détectées (pièces, code postal), éditable avec bouton "Recalculer"
- `src/components/MethodologyPage.jsx` — page transparence ("d'où viennent les prix", disclaimer, fourchettes ±15%, date MAJ)
- `src/components/AnomalyCard.jsx` — carte d'anomalie avec désignation, quantité, type prestation, prix artisan, fourchette marché, écart %, explication
- `src/utils/regionalCoefficient.js` — fonction `getCoefficient(codePostal)` → number
- `tests/fixtures/` — dossier contenant 3 à 5 PDF de devis anonymisés pour tests
- `tests/priceAnalyzer.test.js` — tests unitaires de la logique d'analyse
- `tests/regionalCoefficient.test.js` — tests unitaires du coefficient
- `.env.local.example` — exemple de variables d'env (sans la vraie clé)

### Fichiers modifiés

- `src/App.jsx` — flow simplifié : Upload → Analyse auto (spinner 3 étapes) → Résultats. Suppression de l'étape "Dimensions" du chemin principal.
- `src/utils/pdfExtractor.js` — simplifié : extrait juste le texte brut par page, retourne `{ pages, fullText }`. Suppression de la regex de parsing lignes.
- `src/utils/priceAnalyzer.js` — refonte complète :
  - Nouvelle signature : `analyzeDevis(extractionResult, coefficientRegional)`
  - Distingue `typePrestation` (fourniture_seule / pose_seule / fourniture_et_pose)
  - Supporte multi-pièces (tableau)
  - Match par `categorie` fournie par Claude, plus par keyword
  - Retourne fourchette min/moy/max au lieu d'un prix unique
- `src/utils/surfaceCalculator.js` — étendu pour calculer surfaces multi-pièces, gérer pièces sans dimensions (utilise surfaces moyennes par défaut avec alerte)
- `src/data/prixBTP.json` — régénéré avec la structure v2 (voir section "Base prix")
- `src/components/UploadZone.jsx` — lance l'analyse automatiquement après upload, affiche spinner multi-étapes
- `src/components/AnalysisReport.jsx` — réorienté anomalies-first : bandeau verdict, résumé chiffré, infos détectées éditables, lignes à surveiller (triées par écart desc), lignes conformes (collapsible), non analysables, footer méthodologie
- `package.json` — ajout `@anthropic-ai/sdk` (dependency), `vitest` (devDependency)
- `.gitignore` — ajout `.env.local`, `.vercel/`
- `vite.config.js` — pas de modification si `vercel dev` est utilisé pour le dev local

### Fichiers conservés comme fallback

- `src/components/RoomForm.jsx`, `src/components/RoomList.jsx` — uniquement utilisés si Claude n'a pas pu extraire les dimensions et que le calcul en a besoin

### Fichiers non modifiés

- `src/main.jsx`, `index.html`, `eslint.config.js`, `public/pdf.worker.min.mjs`

## Logique fourniture/pose *(correction du bug structurel)*

### Prompt à Claude (extrait `api/_prompt.js`)

> Pour chaque ligne, détermine `typePrestation` :
> - `"fourniture_et_pose"` si la ligne inclut le matériau ET la pose. Indicateurs : "fourniture et pose", "fourni et posé", pas de mention explicite du contraire. **C'est le cas par défaut dans 85% des devis BTP français.**
> - `"pose_seule"` si la ligne ne facture que la main d'œuvre. Indicateurs : "pose uniquement", "main d'œuvre", "MO seule", "matériau fourni par le client", "hors fourniture".
> - `"fourniture_seule"` si la ligne ne facture que le matériau. Indicateurs : "fourniture seule", "livraison matériau", "hors pose".
> - En cas d'ambiguïté, utilise `"fourniture_et_pose"` et baisse `confidence` à 0.6.

### Calcul dans `priceAnalyzer.js`

```js
function calculateMarketPrice(poste, line, quantiteReelle, coefficient) {
  const { mat_min, mat_moy, mat_max, mo_min, mo_moy, mo_max } = poste

  let matMoy, matMin, matMax, moMoy, moMin, moMax

  switch (line.typePrestation) {
    case 'fourniture_seule':
      matMoy = mat_moy; matMin = mat_min; matMax = mat_max
      moMoy = 0; moMin = 0; moMax = 0
      break
    case 'pose_seule':
      matMoy = 0; matMin = 0; matMax = 0
      moMoy = mo_moy; moMin = mo_min; moMax = mo_max
      break
    case 'fourniture_et_pose':
    default:
      matMoy = mat_moy; matMin = mat_min; matMax = mat_max
      moMoy = mo_moy; moMin = mo_min; moMax = mo_max
      break
  }

  const puMoy = (matMoy + moMoy) * coefficient
  const puMin = (matMin + moMin) * coefficient
  const puMax = (matMax + moMax) * coefficient

  return {
    prixMoyen: Math.round(puMoy * quantiteReelle * 100) / 100,
    fourchetteMin: Math.round(puMin * quantiteReelle * 100) / 100,
    fourchetteMax: Math.round(puMax * quantiteReelle * 100) / 100,
  }
}
```

### Règles de verdict par ligne

| Condition | Verdict |
|---|---|
| `montantHT` ≤ `fourchetteMax` et ≥ `fourchetteMin` | `ok` |
| `montantHT` entre `fourchetteMax` et `fourchetteMax × 1.15` | `warn` |
| `montantHT` > `fourchetteMax × 1.15` | `bad` |
| `montantHT` < `fourchetteMin × 0.85` | `low` (suspicion de prestation incomplète) |
| Poste non reconnu | `unknown` |

## Coefficient régional

Fichier : `src/utils/regionalCoefficient.js`

```js
const COEFFICIENTS = {
  '75': 1.15, '92': 1.15,  // Paris + Hauts-de-Seine
  '77': 1.00, '78': 1.00, '91': 1.00, '93': 1.00, '94': 1.00, '95': 1.00,  // IDF autres
  '69': 0.95, '13': 0.95, '33': 0.95, '31': 0.95, '44': 0.95, '59': 0.95,  // Grandes métropoles
  // ... autres villes moyennes et rural gérés par défaut
}

export function getCoefficient(codePostal) {
  if (!codePostal) return 1.0
  const dep = String(codePostal).slice(0, 2)
  if (COEFFICIENTS[dep] !== undefined) return COEFFICIENTS[dep]
  const numDep = parseInt(dep)
  if (isRural(numDep)) return 0.75
  return 0.85  // ville moyenne par défaut
}
```

La table `COEFFICIENTS` est **à compléter lors de l'implémentation** avec la liste exhaustive des départements. `isRural(dep)` est une heuristique basique (liste blanche des départements réputés ruraux).

## Base `prixBTP.json` — structure v2

```json
{
  "metadata": {
    "version": "2.0.0",
    "date_maj": "2026-04-12",
    "region_base": "Île-de-France hors Paris",
    "source": "Claude generated + relecture manuelle",
    "disclaimer": "Prix indicatifs, fourchette ±15%. Cet outil signale les anomalies, ne certifie pas le prix juste."
  },
  "postes_transverses": {
    "peinture": {
      "peinture_murs_2couches": { "unite": "m²", "mat_min": 5, "mat_moy": 8, "mat_max": 12, "mo_min": 15, "mo_moy": 22, "mo_max": 30, "reviewed": true },
      "peinture_plafond_2couches": { "unite": "m²", "mat_min": 5, "mat_moy": 8, "mat_max": 12, "mo_min": 18, "mo_moy": 24, "mo_max": 32, "reviewed": false }
    },
    "electricite": { },
    "plomberie": { },
    "carrelage": { },
    "menuiserie": { },
    "placo": { }
  },
  "pieces": {
    "salle_de_bain": { "postes_specifiques": { } },
    "cuisine":       { "postes_specifiques": { } },
    "salon":         { "postes_specifiques": { } },
    "chambre":       { "postes_specifiques": { } },
    "wc":            { "postes_specifiques": { } },
    "entree":        { "postes_specifiques": { } },
    "toiture":       { "postes_specifiques": { } },
    "facade":        { "postes_specifiques": { } }
  }
}
```

La résolution d'un poste se fait directement via le chemin `line.poste` fourni par Claude (ex. `"postes_transverses.peinture.peinture_murs_2couches"`). Le prompt envoie à Claude la liste aplatie des chemins disponibles pour qu'il fasse le match précis. Pas de fallback keyword.

Le champ `reviewed: boolean` marque les postes validés manuellement après génération Claude. L'UI peut afficher un indicateur de confiance différent selon `reviewed`. Le script `scripts/generatePrixBTP.js` met `reviewed: false` par défaut sur tout poste généré ; la relecture manuelle passe ce flag à `true`.

## Gestion d'erreur

| Cas | Comportement |
|---|---|
| PDF scanné (aucun texte extrait) | Message : "Ce PDF semble être un scan. L'OCR n'est pas encore supporté." + CTA re-upload. |
| Claude API timeout | Retry 2× avec backoff exponentiel (1s, 2s), puis message + bouton "Réessayer". |
| Clé API invalide / quota dépassé | Log serveur complet + message utilisateur générique "Service temporairement indisponible, réessayez dans quelques minutes." |
| Moins de 3 lignes détectées | "Nous n'avons trouvé que X lignes. Vérifie que le fichier est bien un devis BTP." |
| Code postal non détecté | Fallback : champ éditable pré-rempli vide, coefficient 1.0 par défaut avec alerte visible "Localisation non détectée, saisis le code postal pour affiner l'analyse". |
| Dimensions nécessaires non détectées | Fallback : formulaire RoomForm affiché pour saisie manuelle des pièces concernées, avec explication. |
| Type de pièce non reconnu | Ligne analysée avec `verdict: unknown`, comptée dans "Non analysables" avec raison. |
| Devis entièrement non analysable | Message : "Nous n'avons pas pu identifier les postes de ce devis. Vérifie qu'il s'agit bien d'un devis BTP français." |
| Réponse Claude invalide (JSON parse error) | Log serveur + retry 1× avec prompt renforcé, puis message utilisateur. |

## Output — UI `AnalysisReport`

Sections dans l'ordre :

1. **Bandeau verdict global** : "✓ Devis conforme" / "⚠ 3 anomalies détectées" / "⚠ Devis problématique"
2. **Résumé chiffré** :
   ```
   Total artisan : 4 820 € HT
   Fourchette marché : 3 950 € – 4 650 € HT
   Écart : +170 € (+3.7 %)
   ```
3. **Infos détectées** (carte `DetectedInfo`) — éditable avec bouton "Recalculer" :
   - Pièces détectées avec type et surfaces
   - Code postal et coefficient régional appliqué
   - Type de chantier
4. **Section "Lignes à surveiller"** — lignes avec `verdict: warn` ou `bad`, triées par écart décroissant. Chaque ligne est un `AnomalyCard` avec :
   - Désignation complète
   - Quantité et unité
   - Type prestation (badge : "Fourniture + pose" / "Pose seule" / "Fourniture seule")
   - Prix artisan
   - Fourchette marché (min–max)
   - Écart en € et en %
   - Explication courte ("Ce poste est 28% au-dessus de la fourchette haute du marché pour la pose de grès cérame en IDF.")
5. **Section "Lignes conformes"** — collapsible, liste compacte
6. **Section "Non analysables"** — lignes avec `verdict: unknown`, avec raison ("poste non reconnu", "quantité indéterminée", etc.)
7. **Footer méthodologie** — lien vers `MethodologyPage` + affichage `date_maj` de `prixBTP.json`

## Tests

### Unit tests (Vitest)

- `tests/priceAnalyzer.test.js` :
  - Les 3 cas de `typePrestation` avec un même poste → prix calculés différents attendus
  - Coefficient régional appliqué (Paris vs province vs rural)
  - Multi-pièces : un devis avec sdb + cuisine → répartition correcte des lignes
  - Verdict par ligne : ok / warn / bad / low / unknown
- `tests/regionalCoefficient.test.js` :
  - Paris (75) → 1.15
  - IDF hors Paris (93) → 1.00
  - Lyon (69) → 0.95
  - Ville moyenne (ex. 49) → 0.85
  - Rural (ex. 23) → 0.75
  - Code postal invalide → 1.0

### Integration tests

- 3 à 5 PDF de devis anonymisés dans `tests/fixtures/` couvrant :
  - Devis sdb fourniture + pose (cas standard)
  - Devis cuisine pose seule
  - Devis mixte sdb + cuisine
  - Devis multi-pages (3+ pages)
  - Devis avec code postal non présent
- Les tests mockent l'API Claude (fixtures de réponses JSON) pour éviter coût et flakiness.

### Pas dans le scope

- E2E Playwright (prévu en itération future)
- Test de la Vercel Function end-to-end avec vraie clé API (testé manuellement en staging)

## Scope — HORS de cette itération

- OCR pour PDFs scannés (architecture prête, implémentation v2)
- Historique multi-devis / compte utilisateur
- Export Excel du rapport
- Comparaison de plusieurs devis côte à côte
- Notifications de prix en évolution
- Intégration paiement / abonnement pro
- E2E Playwright
- Support pièces non listées (cave, garage, dépendances)
- Support devis hors résidentiel (ERP, tertiaire)

## Points d'attention pour l'implémentation

1. **Variable d'environnement** : créer la clé `ANTHROPIC_API_KEY` dans le dashboard Vercel (Production + Preview), et dans `.env.local` pour le dev via `vercel dev`. **Ne jamais commit la clé.**
2. **Dev local** : il faudra utiliser `vercel dev` au lieu de `npm run dev` pour que `api/*.js` soit servi. Documenter dans le README.
3. **Coût API** : prévoir ~0,003–0,008 € par devis (input ~3-5k tokens, output ~1-2k tokens avec `claude-sonnet-4-5`). Ajouter un rate limit côté Function (10 req/min par IP ?) pour éviter les abus.
4. **Génération de `prixBTP.json`** : le script `scripts/generatePrixBTP.js` est à exécuter manuellement. La première génération demande une relecture humaine poste par poste, notamment pour les pièces techniques (toiture, façade) où Claude est moins fiable. Les prix validés manuellement doivent être marqués `reviewed: true` dans un champ annexe.
5. **Disclaimer légal** : ajouter dans le footer de l'app et sur la page Méthodologie la mention "Prix indicatifs. DevisCheck ne certifie pas le prix d'un devis — il signale les écarts avec le marché pour t'aider à poser les bonnes questions à ton artisan."
6. **Prompt caching Anthropic** : le prompt d'extraction étant relativement long et constant, utiliser le prompt caching (`cache_control: { type: "ephemeral" }`) sur la partie système pour réduire le coût.
