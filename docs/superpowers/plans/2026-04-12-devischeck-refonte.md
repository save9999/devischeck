# DevisCheck Refonte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre DevisCheck pour détecter automatiquement pièces/métrés/code postal depuis un PDF, distinguer fourniture/pose/fourniture+pose dans l'analyse, supporter toutes les pièces résidentielles, appliquer un coefficient régional, et orienter l'output vers la détection d'anomalies plutôt qu'un "prix exact".

**Architecture:** SPA Vite (inchangé) + Vercel Function `api/analyze-devis.js` qui appelle Claude Sonnet 4.5. PDF.js extrait le texte brut, Claude structure les données (pièces, lignes, code postal, type prestation), `priceAnalyzer` applique les règles métier côté client avec un `prixBTP.json` v2 généré par Claude et relu manuellement.

**Tech Stack:** React 19, Vite 8, pdfjs-dist 4.8, @anthropic-ai/sdk (nouveau), Vitest (nouveau), Vercel Functions Node.

**Spec de référence:** `docs/superpowers/specs/2026-04-12-devischeck-refonte-design.md`

---

## Task 1: Setup dépendances et tests

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `.env.local.example`
- Modify: `.gitignore`

- [ ] **Step 1: Installer les dépendances**

```bash
cd /Users/superbot/devischeck
npm install @anthropic-ai/sdk
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Ajouter les scripts npm dans `package.json`**

Ajouter dans `"scripts"` :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"dev:vercel": "vercel dev"
```

- [ ] **Step 3: Créer `vitest.config.js` à la racine**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: false,
  },
})
```

- [ ] **Step 4: Créer `.env.local.example`**

```
# Copier vers .env.local et remplir pour le dev local via `vercel dev`
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 5: Ajouter `.env.local` et `.vercel/` au `.gitignore`**

Ajouter en fin de fichier (ne pas dupliquer si déjà présent) :
```
.env.local
.vercel/
```

- [ ] **Step 6: Vérifier que vitest tourne (sans tests pour l'instant)**

Run: `npm test`
Expected: "No test files found, exiting with code 0" ou message équivalent vitest — pas d'erreur.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js .env.local.example .gitignore
git commit -m "chore: add anthropic sdk, vitest, vercel dev setup"
```

---

## Task 2: Module coefficient régional

**Files:**
- Create: `src/utils/regionalCoefficient.js`
- Create: `tests/regionalCoefficient.test.js`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/regionalCoefficient.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { getCoefficient } from '../src/utils/regionalCoefficient.js'

describe('getCoefficient', () => {
  it('retourne 1.15 pour Paris (75)', () => {
    expect(getCoefficient('75001')).toBe(1.15)
    expect(getCoefficient('75020')).toBe(1.15)
  })

  it('retourne 1.15 pour Hauts-de-Seine (92)', () => {
    expect(getCoefficient('92100')).toBe(1.15)
  })

  it('retourne 1.00 pour IDF hors Paris (77, 78, 91, 93, 94, 95)', () => {
    expect(getCoefficient('77000')).toBe(1.00)
    expect(getCoefficient('93200')).toBe(1.00)
    expect(getCoefficient('95000')).toBe(1.00)
  })

  it('retourne 0.95 pour les grandes métropoles (Lyon 69, Marseille 13, Bordeaux 33, Toulouse 31, Nantes 44, Lille 59)', () => {
    expect(getCoefficient('69000')).toBe(0.95)
    expect(getCoefficient('13001')).toBe(0.95)
    expect(getCoefficient('33000')).toBe(0.95)
    expect(getCoefficient('31000')).toBe(0.95)
    expect(getCoefficient('44000')).toBe(0.95)
    expect(getCoefficient('59000')).toBe(0.95)
  })

  it('retourne 0.85 pour une ville moyenne (ex. Angers 49)', () => {
    expect(getCoefficient('49000')).toBe(0.85)
  })

  it('retourne 0.75 pour un département rural (ex. Creuse 23)', () => {
    expect(getCoefficient('23000')).toBe(0.75)
  })

  it('retourne 1.0 pour un code postal invalide ou null', () => {
    expect(getCoefficient(null)).toBe(1.0)
    expect(getCoefficient('')).toBe(1.0)
    expect(getCoefficient('abc')).toBe(1.0)
  })

  it('accepte un code postal en number', () => {
    expect(getCoefficient(75001)).toBe(1.15)
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npm test regionalCoefficient`
Expected: FAIL — module `regionalCoefficient.js` introuvable.

- [ ] **Step 3: Implémenter `src/utils/regionalCoefficient.js`**

```js
// Départements réputés ruraux (INSEE : faible densité)
const RURAL_DEPARTEMENTS = new Set([
  '03','04','05','07','08','09','12','15','16','18','19','23','24','32',
  '36','39','40','43','46','48','52','53','55','58','61','65','70','71',
  '79','81','82','87','88','89','90'
])

const COEFFICIENTS = {
  // Paris + proche couronne premium
  '75': 1.15, '92': 1.15,
  // IDF hors Paris
  '77': 1.00, '78': 1.00, '91': 1.00, '93': 1.00, '94': 1.00, '95': 1.00,
  // Grandes métropoles régionales
  '69': 0.95, // Rhône (Lyon)
  '13': 0.95, // Bouches-du-Rhône (Marseille)
  '33': 0.95, // Gironde (Bordeaux)
  '31': 0.95, // Haute-Garonne (Toulouse)
  '44': 0.95, // Loire-Atlantique (Nantes)
  '59': 0.95, // Nord (Lille)
  '06': 0.95, // Alpes-Maritimes (Nice)
  '34': 0.95, // Hérault (Montpellier)
  '67': 0.95, // Bas-Rhin (Strasbourg)
  '38': 0.95, // Isère (Grenoble)
}

export function getCoefficient(codePostal) {
  if (codePostal === null || codePostal === undefined) return 1.0
  const cp = String(codePostal).trim()
  if (!/^\d{4,5}$/.test(cp)) return 1.0
  const dep = cp.length === 4 ? '0' + cp.slice(0, 1) : cp.slice(0, 2)
  if (COEFFICIENTS[dep] !== undefined) return COEFFICIENTS[dep]
  if (RURAL_DEPARTEMENTS.has(dep)) return 0.75
  return 0.85 // ville moyenne par défaut
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npm test regionalCoefficient`
Expected: PASS — tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/utils/regionalCoefficient.js tests/regionalCoefficient.test.js
git commit -m "feat: add regional coefficient utility with tests"
```

---

## Task 3: Simplifier pdfExtractor

**Files:**
- Modify: `src/utils/pdfExtractor.js` (remplacement intégral)
- Create: `tests/pdfExtractor.test.js`

- [ ] **Step 1: Lire le contenu actuel pour comprendre l'import du worker**

Run: `cat src/utils/pdfExtractor.js | head -10`
Expected: première ligne = `import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'`

- [ ] **Step 2: Remplacer `src/utils/pdfExtractor.js`**

```js
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Worker copié dans public/ — accessible à la racine du site
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

/**
 * Extrait le texte brut d'un PDF page par page.
 * Aucune tentative de parsing : on retourne le texte tel quel, ordonné
 * par position Y puis X, pour que Claude puisse le structurer.
 *
 * @param {File} file - fichier PDF uploadé
 * @returns {Promise<{ pages: string[], fullText: string, numPages: number }>}
 */
export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer)
  }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Regrouper les items par position Y (arrondie), puis trier X asc
    const byY = {}
    for (const item of content.items) {
      const str = item.str
      if (!str) continue
      const y = Math.round(item.transform[5])
      const x = Math.round(item.transform[4])
      if (!byY[y]) byY[y] = []
      byY[y].push({ str, x })
    }
    const yKeys = Object.keys(byY).sort((a, b) => Number(b) - Number(a))
    const lines = yKeys.map(y =>
      byY[y].sort((a, b) => a.x - b.x).map(c => c.str).join(' ')
    )
    pages.push(lines.join('\n'))
  }

  return {
    pages,
    fullText: pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join('\n\n'),
    numPages: pdf.numPages,
  }
}
```

- [ ] **Step 3: Commit (pas de test unit ici — testé via fixture plus tard)**

```bash
git add src/utils/pdfExtractor.js
git commit -m "refactor: simplify pdfExtractor to return raw text per page"
```

---

## Task 4: Template du prompt Claude

**Files:**
- Create: `api/_prompt.js`
- Create: `tests/prompt.test.js`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/prompt.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { buildExtractionPrompt, SYSTEM_PROMPT } from '../api/_prompt.js'

describe('buildExtractionPrompt', () => {
  it('inclut le fullText du devis', () => {
    const out = buildExtractionPrompt('Ligne 1 ceci est un devis', ['postes_transverses.peinture.peinture_murs_2couches'])
    expect(out).toContain('Ligne 1 ceci est un devis')
  })

  it('inclut la liste aplatie des postes disponibles', () => {
    const postes = [
      'postes_transverses.peinture.peinture_murs_2couches',
      'pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard',
    ]
    const out = buildExtractionPrompt('devis', postes)
    expect(out).toContain('postes_transverses.peinture.peinture_murs_2couches')
    expect(out).toContain('pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard')
  })

  it('SYSTEM_PROMPT mentionne les 3 valeurs de typePrestation', () => {
    expect(SYSTEM_PROMPT).toContain('fourniture_et_pose')
    expect(SYSTEM_PROMPT).toContain('pose_seule')
    expect(SYSTEM_PROMPT).toContain('fourniture_seule')
  })

  it('SYSTEM_PROMPT exige une sortie JSON', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('json')
  })
})
```

- [ ] **Step 2: Lancer, vérifier échec**

Run: `npm test prompt`
Expected: FAIL — module `api/_prompt.js` introuvable.

- [ ] **Step 3: Créer `api/_prompt.js`**

```js
export const SYSTEM_PROMPT = `Tu es un expert BTP français qui analyse des devis de travaux pour détecter des anomalies de prix.

Ton rôle : à partir du texte brut d'un devis PDF, produire un JSON strictement structuré qui sera consommé par un moteur d'analyse automatique.

**Règles absolues :**

1. **Lire TOUTES les pages.** Aucune ligne ne doit être oubliée. Si le devis a 5 pages, le JSON doit contenir toutes les lignes des 5 pages.

2. **Détecter le code postal du chantier** s'il est présent (bloc "Chantier", "Adresse des travaux", etc.). Sinon \`codePostal: null\`.

3. **Identifier les pièces** (salle de bain, cuisine, salon, chambre, WC, entrée, toiture, façade). Un devis peut mélanger plusieurs pièces. Associe chaque ligne à la pièce correspondante via \`pieceId\`.

4. **Extraire les dimensions** (longueur × largeur × hauteur, ou surface) si mentionnées dans le devis. Si absentes, \`dimensions: null\` et le moteur appliquera des surfaces moyennes par défaut.

5. **Déterminer \`typePrestation\` pour chaque ligne** — CRUCIAL :
   - \`"fourniture_et_pose"\` : la ligne inclut le matériau ET la pose. Indicateurs : "fourniture et pose", "fourni et posé", pas de mention explicite du contraire. **Cas par défaut (85% des devis BTP français).**
   - \`"pose_seule"\` : main d'œuvre seule. Indicateurs : "pose uniquement", "main d'œuvre", "MO seule", "matériau fourni par le client", "hors fourniture".
   - \`"fourniture_seule"\` : matériau seul. Indicateurs : "fourniture seule", "livraison matériau", "hors pose".
   - En cas de doute, utilise \`"fourniture_et_pose"\` et baisse \`confidence\` à 0.6.

6. **Associer chaque ligne à un \`poste\`** — chemin exact choisi dans la liste fournie plus bas. Tu DOIS choisir un chemin qui existe dans la liste. Si aucun ne correspond raisonnablement, \`poste: null\` et \`confidence: 0.3\`.

7. **Sortie : JSON uniquement**, sans markdown, sans backticks, sans explication. Le JSON doit être directement parsable par JSON.parse().

**Structure du JSON de sortie :**

\`\`\`
{
  "codePostal": "75011" | null,
  "ville": "Paris" | null,
  "pieces": [
    {
      "id": "piece-1",
      "type": "salle_de_bain" | "cuisine" | "salon" | "chambre" | "wc" | "entree" | "toiture" | "facade",
      "nom": "Salle de bain principale",
      "dimensions": { "longueur": 2.5, "largeur": 1.8, "hauteur": 2.4 } | null,
      "surfaces": { "sol": 4.5, "murs": 20.6 } | null,
      "lineIds": [1, 2, 3]
    }
  ],
  "lines": [
    {
      "numero": 1,
      "designation": "Fourniture et pose de carrelage grès cérame sol",
      "quantite": 4.5,
      "unite": "m²" | "ml" | "u" | "fft",
      "prixUnitaire": 85.0,
      "montantHT": 382.5,
      "typePrestation": "fourniture_et_pose",
      "poste": "postes_transverses.carrelage.sol_gres_cerame",
      "pieceId": "piece-1",
      "confidence": 0.9
    }
  ],
  "totalHT": 3850.0,
  "warnings": ["Code postal non détecté"]
}
\`\`\`

**Jamais** :
- Inventer des lignes qui ne sont pas dans le devis
- Modifier les montants
- Traduire la désignation
- Répondre autre chose qu'un JSON valide
`

/**
 * Construit le prompt utilisateur pour l'extraction d'un devis.
 * @param {string} fullText - texte brut extrait du PDF
 * @param {string[]} availablePostes - liste aplatie des chemins de postes disponibles dans prixBTP.json
 * @returns {string}
 */
export function buildExtractionPrompt(fullText, availablePostes) {
  return `**Postes disponibles** (choisis le chemin EXACT parmi cette liste pour chaque ligne) :

${availablePostes.map(p => `- ${p}`).join('\n')}

---

**Texte du devis à analyser** :

${fullText}

---

Retourne uniquement le JSON conforme au schéma décrit dans le system prompt.`
}
```

- [ ] **Step 4: Lancer le test**

Run: `npm test prompt`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_prompt.js tests/prompt.test.js
git commit -m "feat: add Claude extraction prompt template with tests"
```

---

## Task 5: Vercel Function `api/analyze-devis.js`

**Files:**
- Create: `api/analyze-devis.js`
- Create: `api/_postesLoader.js`

- [ ] **Step 1: Créer `api/_postesLoader.js`** (utilitaire pour aplatir `prixBTP.json`)

```js
import prixBTP from '../src/data/prixBTP.json' assert { type: 'json' }

/**
 * Retourne la liste aplatie des chemins de postes disponibles.
 * Ex: ["postes_transverses.peinture.peinture_murs_2couches", ...]
 * @returns {string[]}
 */
export function listAvailablePostes() {
  const paths = []

  // postes_transverses.<categorie>.<poste>
  const transverses = prixBTP.postes_transverses || {}
  for (const [cat, postes] of Object.entries(transverses)) {
    for (const posteName of Object.keys(postes)) {
      paths.push(`postes_transverses.${cat}.${posteName}`)
    }
  }

  // pieces.<type>.postes_specifiques.<categorie>.<poste>
  const pieces = prixBTP.pieces || {}
  for (const [pieceType, pieceData] of Object.entries(pieces)) {
    const spec = pieceData.postes_specifiques || {}
    for (const [cat, postes] of Object.entries(spec)) {
      for (const posteName of Object.keys(postes)) {
        paths.push(`pieces.${pieceType}.postes_specifiques.${cat}.${posteName}`)
      }
    }
  }

  return paths
}
```

- [ ] **Step 2: Créer `api/analyze-devis.js`**

```js
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildExtractionPrompt } from './_prompt.js'
import { listAvailablePostes } from './_postesLoader.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rate limit naïf en mémoire : 10 req / 60s par IP
const rateLimit = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10

function checkRateLimit(ip) {
  const now = Date.now()
  const entries = rateLimit.get(ip) || []
  const recent = entries.filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) return false
  recent.push(now)
  rateLimit.set(ip, recent)
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Trop de requêtes. Réessaie dans une minute.' })
    return
  }

  const { fullText } = req.body || {}
  if (typeof fullText !== 'string' || fullText.length < 50) {
    res.status(400).json({ error: 'Texte de devis trop court ou manquant.' })
    return
  }
  if (fullText.length > 200_000) {
    res.status(413).json({ error: 'Devis trop volumineux.' })
    return
  }

  const availablePostes = listAvailablePostes()
  const userPrompt = buildExtractionPrompt(fullText, availablePostes)

  try {
    const response = await callClaudeWithRetry(userPrompt)
    const json = parseClaudeJson(response)
    res.status(200).json(json)
  } catch (err) {
    console.error('analyze-devis error:', err)
    res.status(502).json({
      error: 'Analyse impossible. Réessaie dans quelques instants.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }
}

async function callClaudeWithRetry(userPrompt, attempt = 1) {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })
    return msg
  } catch (err) {
    if (attempt >= 3) throw err
    await new Promise(r => setTimeout(r, 1000 * attempt))
    return callClaudeWithRetry(userPrompt, attempt + 1)
  }
}

function parseClaudeJson(response) {
  const block = response.content?.find(b => b.type === 'text')
  if (!block) throw new Error('Réponse Claude sans texte')
  let text = block.text.trim()
  // Retirer d'éventuels fences ```json même si le prompt demande du JSON pur
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`JSON Claude invalide: ${e.message}`)
  }
}
```

- [ ] **Step 3: Vérifier que l'import fonctionne sans crash**

Run: `node -e "import('./api/_postesLoader.js').then(m => console.log(m.listAvailablePostes().slice(0,3)))"`
Expected: affiche une liste (vide ou quelques entrées selon l'état de `prixBTP.json`). Aucune erreur d'import.

Note : l'handler ne sera testé en vrai qu'après la Task 6 (base de prix) et en `vercel dev` à la fin.

- [ ] **Step 4: Commit**

```bash
git add api/_postesLoader.js api/analyze-devis.js
git commit -m "feat: add Vercel function for devis analysis via Claude"
```

---

## Task 6: Seed `prixBTP.json` v2 avec structure minimale

**Files:**
- Modify: `src/data/prixBTP.json` (remplacement intégral)

**Contexte :** on ne génère pas la base complète ici (c'est Task 7 via un script). On pose juste la structure v2 avec quelques postes représentatifs pour permettre le dev et les tests.

- [ ] **Step 1: Remplacer `src/data/prixBTP.json` par la structure v2 de seed**

```json
{
  "metadata": {
    "version": "2.0.0",
    "date_maj": "2026-04-12",
    "region_base": "Île-de-France hors Paris",
    "source": "Seed initial — à compléter via scripts/generatePrixBTP.js",
    "disclaimer": "Prix indicatifs, fourchette ±15%. Cet outil signale les anomalies, ne certifie pas le prix juste."
  },
  "postes_transverses": {
    "peinture": {
      "peinture_murs_2couches": { "unite": "m²", "mat_min": 5, "mat_moy": 8, "mat_max": 12, "mo_min": 15, "mo_moy": 22, "mo_max": 30, "reviewed": true },
      "peinture_plafond_2couches": { "unite": "m²", "mat_min": 5, "mat_moy": 8, "mat_max": 12, "mo_min": 18, "mo_moy": 24, "mo_max": 32, "reviewed": true },
      "enduit_lissage": { "unite": "m²", "mat_min": 3, "mat_moy": 5, "mat_max": 8, "mo_min": 12, "mo_moy": 15, "mo_max": 20, "reviewed": true }
    },
    "carrelage": {
      "sol_gres_cerame": { "unite": "m²", "mat_min": 15, "mat_moy": 20, "mat_max": 35, "mo_min": 45, "mo_moy": 65, "mo_max": 85, "reviewed": true },
      "faience_murale": { "unite": "m²", "mat_min": 14, "mat_moy": 18, "mat_max": 30, "mo_min": 50, "mo_moy": 62, "mo_max": 80, "reviewed": true }
    },
    "electricite": {
      "prise_simple": { "unite": "u", "mat_min": 8, "mat_moy": 12, "mat_max": 20, "mo_min": 25, "mo_moy": 35, "mo_max": 50, "reviewed": false },
      "point_lumineux": { "unite": "u", "mat_min": 10, "mat_moy": 15, "mat_max": 25, "mo_min": 30, "mo_moy": 45, "mo_max": 65, "reviewed": false }
    },
    "plomberie": {
      "alimentation_per": { "unite": "ml", "mat_min": 8, "mat_moy": 12, "mat_max": 18, "mo_min": 25, "mo_moy": 38, "mo_max": 50, "reviewed": true }
    }
  },
  "pieces": {
    "salle_de_bain": {
      "postes_specifiques": {
        "plomberie": {
          "receveur_standard": { "unite": "u", "mat_min": 180, "mat_moy": 250, "mat_max": 400, "mo_min": 150, "mo_moy": 200, "mo_max": 300, "reviewed": true },
          "paroi_douche_fixe": { "unite": "u", "mat_min": 250, "mat_moy": 350, "mat_max": 500, "mo_min": 100, "mo_moy": 150, "mo_max": 200, "reviewed": true },
          "mitigeur_douche": { "unite": "u", "mat_min": 50, "mat_moy": 75, "mat_max": 120, "mo_min": 60, "mo_moy": 80, "mo_max": 120, "reviewed": true },
          "mitigeur_lavabo": { "unite": "u", "mat_min": 40, "mat_moy": 60, "mat_max": 100, "mo_min": 50, "mo_moy": 70, "mo_max": 100, "reviewed": true },
          "meuble_vasque": { "unite": "u", "mat_min": 120, "mat_moy": 180, "mat_max": 300, "mo_min": 80, "mo_moy": 120, "mo_max": 180, "reviewed": true }
        },
        "depose": {
          "cabine_douche": { "unite": "u", "mat_min": 0, "mat_moy": 0, "mat_max": 0, "mo_min": 100, "mo_moy": 130, "mo_max": 170, "reviewed": true }
        }
      }
    },
    "cuisine": {
      "postes_specifiques": {
        "meubles": {
          "meuble_bas_standard": { "unite": "ml", "mat_min": 200, "mat_moy": 350, "mat_max": 600, "mo_min": 80, "mo_moy": 120, "mo_max": 180, "reviewed": false },
          "meuble_haut_standard": { "unite": "ml", "mat_min": 150, "mat_moy": 280, "mat_max": 500, "mo_min": 80, "mo_moy": 120, "mo_max": 180, "reviewed": false },
          "plan_travail_stratifie": { "unite": "ml", "mat_min": 80, "mat_moy": 150, "mat_max": 280, "mo_min": 40, "mo_moy": 60, "mo_max": 90, "reviewed": false }
        }
      }
    },
    "salon": { "postes_specifiques": {} },
    "chambre": { "postes_specifiques": {} },
    "wc": { "postes_specifiques": {} },
    "entree": { "postes_specifiques": {} },
    "toiture": { "postes_specifiques": {} },
    "facade": { "postes_specifiques": {} }
  }
}
```

- [ ] **Step 2: Vérifier que le loader retourne la liste aplatie**

Run: `node -e "import('./api/_postesLoader.js').then(m => console.log(m.listAvailablePostes()))"`
Expected: liste ~15-18 chemins, aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/data/prixBTP.json
git commit -m "feat: seed prixBTP.json v2 with multi-pieces structure"
```

---

## Task 7: Script de régénération `generatePrixBTP.js`

**Files:**
- Create: `scripts/generatePrixBTP.js`
- Modify: `package.json` (ajout script npm)

- [ ] **Step 1: Créer `scripts/generatePrixBTP.js`**

```js
#!/usr/bin/env node
/**
 * Régénère (ou enrichit) src/data/prixBTP.json via Claude.
 * Usage : node scripts/generatePrixBTP.js [--dry-run]
 *
 * Le script produit un nouveau JSON à ./src/data/prixBTP.next.json.
 * L'opérateur humain relit le diff et renomme manuellement en prixBTP.json
 * après validation. reviewed est toujours false sur les entrées générées.
 */
import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.resolve(__dirname, '../src/data/prixBTP.next.json')
const DRY_RUN = process.argv.includes('--dry-run')

const REQUIRED_POSTES = {
  postes_transverses: {
    peinture: ['peinture_murs_2couches', 'peinture_plafond_2couches', 'enduit_lissage', 'sous_couche'],
    carrelage: ['sol_gres_cerame', 'faience_murale', 'joint_carrelage'],
    electricite: ['prise_simple', 'point_lumineux', 'interrupteur', 'tableau_electrique_basique'],
    plomberie: ['alimentation_per', 'evacuation_pvc'],
    menuiserie: ['porte_interieure_standard', 'plinthe_bois'],
    placo: ['cloison_placo_simple', 'faux_plafond_placo'],
  },
  pieces: {
    salle_de_bain: { plomberie: ['receveur_standard', 'paroi_douche_fixe', 'mitigeur_douche', 'mitigeur_lavabo', 'meuble_vasque'], depose: ['cabine_douche', 'baignoire'] },
    cuisine: { meubles: ['meuble_bas_standard', 'meuble_haut_standard', 'plan_travail_stratifie', 'credence_verre'], electromenager: ['pose_four_encastre', 'pose_plaque_cuisson'] },
    salon: { revetements: ['parquet_flottant', 'moulure_murale'] },
    chambre: { revetements: ['parquet_flottant', 'placard_integre'] },
    wc: { plomberie: ['wc_suspendu_bati_support', 'wc_classique'] },
    entree: { revetements: ['carrelage_entree'] },
    toiture: { couverture: ['tuile_terre_cuite', 'zinguerie_gouttiere'], isolation: ['isolation_combles'] },
    facade: { ravalement: ['enduit_monocouche', 'peinture_facade'], isolation: ['ite_polystyrene'] },
  },
}

const SYSTEM = `Tu es un expert prix BTP France 2025-2026. Tu génères des fourchettes de prix HT.

**Règles strictes :**
- Zone base : Île-de-France hors Paris, année 2025-2026
- Pour chaque poste, donne : unite, mat_min, mat_moy, mat_max, mo_min, mo_moy, mo_max
- mat_* = fourniture matériau seule (HT, hors déplacement)
- mo_* = main d'œuvre seule (HT, hors déplacement)
- Si le poste est une dépose, mat_* = 0
- Si tu n'es pas sûr à 80% d'une fourchette, retourne \`null\` pour ce poste

Sortie : JSON uniquement, pas de markdown.
`

function buildUserPrompt() {
  return `Génère les fourchettes de prix pour ces postes.

${JSON.stringify(REQUIRED_POSTES, null, 2)}

Retourne un JSON strictement conforme à cette structure :

{
  "postes_transverses": {
    "<categorie>": {
      "<posteName>": { "unite": "m²|ml|u|fft", "mat_min": N, "mat_moy": N, "mat_max": N, "mo_min": N, "mo_moy": N, "mo_max": N }
    }
  },
  "pieces": {
    "<pieceType>": {
      "postes_specifiques": {
        "<categorie>": {
          "<posteName>": { ... }
        }
      }
    }
  }
}
`
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY manquant. export ou source .env.local')
    process.exit(1)
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log('[generatePrixBTP] Appel Claude en cours...')
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildUserPrompt() }],
  })
  const text = msg.content.find(b => b.type === 'text').text
    .replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '')

  const generated = JSON.parse(text)

  // Ajouter reviewed: false partout
  const addReviewed = (obj) => {
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (v && typeof v === 'object' && 'unite' in v) {
        v.reviewed = false
      } else if (v && typeof v === 'object') {
        addReviewed(v)
      }
    }
  }
  addReviewed(generated)

  const output = {
    metadata: {
      version: '2.0.0',
      date_maj: new Date().toISOString().slice(0, 10),
      region_base: 'Île-de-France hors Paris',
      source: 'Claude generated via scripts/generatePrixBTP.js',
      disclaimer: 'Prix indicatifs, fourchette ±15%. Cet outil signale les anomalies, ne certifie pas le prix juste.',
    },
    ...generated,
  }

  if (DRY_RUN) {
    console.log(JSON.stringify(output, null, 2))
    return
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), 'utf8')
  console.log(`[generatePrixBTP] Écrit dans ${OUT_PATH}`)
  console.log('Relis le fichier, compare avec prixBTP.json, puis renomme-le manuellement.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Ajouter le script npm dans `package.json`**

Dans `"scripts"` :
```json
"prix:generate": "node scripts/generatePrixBTP.js"
```

- [ ] **Step 3: Commit (sans exécuter — c'est un outil opérateur)**

```bash
git add scripts/generatePrixBTP.js package.json
git commit -m "feat: add script to regenerate prixBTP via Claude"
```

---

## Task 8: Refonte `priceAnalyzer.js` — fourniture/pose + multi-pièces

**Files:**
- Modify: `src/utils/priceAnalyzer.js` (remplacement intégral)
- Create: `tests/priceAnalyzer.test.js`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/priceAnalyzer.test.js` (tous les appels utilisent dès le départ la signature `analyzeDevis(extraction, prixBTP)`) :

```js
import { describe, it, expect } from 'vitest'
import { analyzeDevis, resolvePoste } from '../src/utils/priceAnalyzer.js'
import prixBTP from '../src/data/prixBTP.json'

const base = {
  codePostal: '93200',
  ville: null,
  pieces: [{ id: 'p1', type: 'salle_de_bain', nom: 'SdB', dimensions: null, surfaces: { sol: 5, murs: 22 }, lineIds: [1] }],
  totalHT: 0,
  warnings: [],
}

describe('resolvePoste', () => {
  it('résout un chemin postes_transverses', () => {
    const poste = resolvePoste(prixBTP, 'postes_transverses.peinture.peinture_murs_2couches')
    expect(poste).toBeTruthy()
    expect(poste.unite).toBe('m²')
    expect(poste.mat_moy).toBe(8)
  })

  it('résout un chemin pieces.postes_specifiques', () => {
    const poste = resolvePoste(prixBTP, 'pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard')
    expect(poste).toBeTruthy()
    expect(poste.unite).toBe('u')
  })

  it('retourne null pour chemin inexistant', () => {
    expect(resolvePoste(prixBTP, 'postes_transverses.inexistant.foo')).toBeNull()
  })
})

describe('analyzeDevis — typePrestation', () => {
  const lineTemplate = {
    numero: 1, designation: 'Peinture murs', quantite: 20, unite: 'm²',
    pieceId: 'p1', poste: 'postes_transverses.peinture.peinture_murs_2couches',
    confidence: 0.9,
  }

  it('fourniture_et_pose : somme mat+mo', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 30, montantHT: 600 }],
    }, prixBTP)
    // (mat_moy 8 + mo_moy 22) * coef 1.00 * 20m² = 600 → verdict ok
    expect(result.lines[0].verdict).toBe('ok')
    expect(result.lines[0].prixMarche.prixMoyen).toBe(600)
  })

  it('pose_seule : utilise UNIQUEMENT mo_moy', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'pose_seule', prixUnitaire: 22, montantHT: 440 }],
    }, prixBTP)
    // mo_moy 22 * 1.00 * 20 = 440
    expect(result.lines[0].prixMarche.prixMoyen).toBe(440)
    expect(result.lines[0].verdict).toBe('ok')
  })

  it('fourniture_seule : utilise UNIQUEMENT mat_moy', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_seule', prixUnitaire: 8, montantHT: 160 }],
    }, prixBTP)
    expect(result.lines[0].prixMarche.prixMoyen).toBe(160)
  })

  it('classe `bad` si montant > fourchetteMax * 1.15', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 60, montantHT: 1200 }],
    }, prixBTP)
    // fourchetteMax = (12 + 30) * 1.00 * 20 = 840 ; 1200 > 840 * 1.15 = 966 → bad
    expect(result.lines[0].verdict).toBe('bad')
  })

  it('classe `warn` si montant entre fourchetteMax et fourchetteMax * 1.15', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 46, montantHT: 920 }],
    }, prixBTP)
    // 920 > 840 mais < 966 → warn
    expect(result.lines[0].verdict).toBe('warn')
  })

  it('classe `low` si montant < fourchetteMin * 0.85', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 15, montantHT: 300 }],
    }, prixBTP)
    // fourchetteMin = (5 + 15) * 1.00 * 20 = 400 ; 300 < 400 * 0.85 = 340 → low
    expect(result.lines[0].verdict).toBe('low')
  })

  it('classe `unknown` si poste null', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', poste: null, prixUnitaire: 30, montantHT: 600 }],
    }, prixBTP)
    expect(result.lines[0].verdict).toBe('unknown')
  })
})

describe('analyzeDevis — coefficient régional', () => {
  const line = {
    numero: 1, designation: 'x', quantite: 20, unite: 'm²', pieceId: 'p1',
    poste: 'postes_transverses.peinture.peinture_murs_2couches',
    typePrestation: 'fourniture_et_pose', prixUnitaire: 30, montantHT: 600, confidence: 0.9,
  }

  it('Paris (75) applique ×1.15', () => {
    const result = analyzeDevis({ ...base, codePostal: '75011', lines: [line] }, prixBTP)
    // (8 + 22) * 1.15 * 20 = 690
    expect(result.lines[0].prixMarche.prixMoyen).toBe(690)
  })

  it('Lyon (69) applique ×0.95', () => {
    const result = analyzeDevis({ ...base, codePostal: '69001', lines: [line] }, prixBTP)
    expect(result.lines[0].prixMarche.prixMoyen).toBe(570)
  })
})

describe('analyzeDevis — totaux et verdict global', () => {
  it('calcule totalArtisan, totalMarcheMoyen, écart global', () => {
    const result = analyzeDevis({
      ...base,
      lines: [
        {
          numero: 1, designation: 'x', quantite: 20, unite: 'm²', pieceId: 'p1',
          poste: 'postes_transverses.peinture.peinture_murs_2couches',
          typePrestation: 'fourniture_et_pose', prixUnitaire: 30, montantHT: 600, confidence: 0.9,
        },
      ],
    }, prixBTP)
    expect(result.totalArtisan).toBe(600)
    expect(result.totalMarcheMoyen).toBe(600)
    expect(result.ecartPourcent).toBe(0)
    expect(result.verdict).toBe('ok')
  })
})
```

- [ ] **Step 2: Lancer, vérifier échec**

Run: `npm test priceAnalyzer`
Expected: FAIL — fonctions pas encore définies.

- [ ] **Step 3: Remplacer `src/utils/priceAnalyzer.js`**

```js
import { getCoefficient } from './regionalCoefficient.js'

/**
 * Résout un chemin de poste dans la structure prixBTP.
 * @param {object} prixBTP
 * @param {string|null} path - ex: "postes_transverses.peinture.peinture_murs_2couches"
 * @returns {object|null}
 */
export function resolvePoste(prixBTP, path) {
  if (!path || typeof path !== 'string') return null
  const parts = path.split('.')
  let cur = prixBTP
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return null
    cur = cur[p]
  }
  if (!cur || typeof cur !== 'object' || !('unite' in cur)) return null
  return cur
}

/**
 * Calcule la quantité réelle à utiliser pour une ligne.
 * Respecte la quantité déclarée dans le devis (c'est ce qui est facturé).
 */
function resolveQuantite(line) {
  const q = Number(line.quantite)
  if (Number.isFinite(q) && q > 0) return q
  return 1
}

/**
 * Calcule la fourchette de prix marché pour une ligne selon son typePrestation.
 */
function calculateMarketPrice(poste, line, coefficient) {
  const { mat_min = 0, mat_moy = 0, mat_max = 0, mo_min = 0, mo_moy = 0, mo_max = 0 } = poste
  let matMin = 0, matMoy = 0, matMax = 0, moMin = 0, moMoy = 0, moMax = 0

  switch (line.typePrestation) {
    case 'fourniture_seule':
      matMin = mat_min; matMoy = mat_moy; matMax = mat_max
      break
    case 'pose_seule':
      moMin = mo_min; moMoy = mo_moy; moMax = mo_max
      break
    case 'fourniture_et_pose':
    default:
      matMin = mat_min; matMoy = mat_moy; matMax = mat_max
      moMin = mo_min; moMoy = mo_moy; moMax = mo_max
      break
  }

  const q = resolveQuantite(line)
  const puMoy = (matMoy + moMoy) * coefficient
  const puMin = (matMin + moMin) * coefficient
  const puMax = (matMax + moMax) * coefficient

  return {
    prixMoyen: Math.round(puMoy * q * 100) / 100,
    fourchetteMin: Math.round(puMin * q * 100) / 100,
    fourchetteMax: Math.round(puMax * q * 100) / 100,
  }
}

function classifyLine(montantHT, prixMarche) {
  const { fourchetteMin, fourchetteMax } = prixMarche
  if (montantHT >= fourchetteMin && montantHT <= fourchetteMax) return 'ok'
  if (montantHT > fourchetteMax && montantHT <= fourchetteMax * 1.15) return 'warn'
  if (montantHT > fourchetteMax * 1.15) return 'bad'
  if (montantHT < fourchetteMin * 0.85) return 'low'
  return 'ok' // entre fourchetteMin * 0.85 et fourchetteMin : toléré
}

/**
 * Point d'entrée. Consomme un objet extraction (sortie de l'API Claude)
 * et retourne un rapport enrichi avec verdicts et fourchettes marché.
 *
 * @param {object} extraction
 * @param {object} prixBTP - importé par le caller (pour testabilité)
 */
export function analyzeDevis(extraction, prixBTP) {
  if (!prixBTP) {
    // Import dynamique par défaut pour usage runtime
    throw new Error('analyzeDevis: prixBTP est requis en argument')
  }

  const coefficient = getCoefficient(extraction.codePostal)
  const analyzedLines = (extraction.lines || []).map(line => {
    const poste = resolvePoste(prixBTP, line.poste)

    if (!poste) {
      return {
        ...line,
        matched: false,
        prixMarche: null,
        verdict: 'unknown',
        raisonNonMatch: line.poste ? 'poste_introuvable' : 'poste_non_identifie',
      }
    }

    const prixMarche = calculateMarketPrice(poste, line, coefficient)
    const verdict = classifyLine(Number(line.montantHT) || 0, prixMarche)
    const ecartMoyen = Math.round((Number(line.montantHT || 0) - prixMarche.prixMoyen) * 100) / 100
    const ecartPourcent = prixMarche.prixMoyen > 0
      ? Math.round((ecartMoyen / prixMarche.prixMoyen) * 100)
      : 0

    return {
      ...line,
      matched: true,
      prixMarche,
      ecartMoyen,
      ecartPourcent,
      verdict,
    }
  })

  // Tri : anomalies en premier (bad > warn > low > ok > unknown)
  const verdictOrder = { bad: 0, warn: 1, low: 2, ok: 3, unknown: 4 }
  analyzedLines.sort((a, b) => {
    const va = verdictOrder[a.verdict] ?? 5
    const vb = verdictOrder[b.verdict] ?? 5
    if (va !== vb) return va - vb
    return (b.ecartPourcent || 0) - (a.ecartPourcent || 0)
  })

  const totalArtisan = analyzedLines.reduce((s, l) => s + (Number(l.montantHT) || 0), 0)
  const totalMarcheMoyen = analyzedLines
    .filter(l => l.matched)
    .reduce((s, l) => s + l.prixMarche.prixMoyen, 0)
  const totalMarcheMin = analyzedLines
    .filter(l => l.matched)
    .reduce((s, l) => s + l.prixMarche.fourchetteMin, 0)
  const totalMarcheMax = analyzedLines
    .filter(l => l.matched)
    .reduce((s, l) => s + l.prixMarche.fourchetteMax, 0)

  const ecartPourcent = totalMarcheMoyen > 0
    ? Math.round(((totalArtisan - totalMarcheMoyen) / totalMarcheMoyen) * 100)
    : 0

  let verdict = 'ok'
  if (ecartPourcent > 30) verdict = 'bad'
  else if (ecartPourcent > 10) verdict = 'warn'

  return {
    codePostal: extraction.codePostal,
    coefficient,
    pieces: extraction.pieces || [],
    lines: analyzedLines,
    totalArtisan: Math.round(totalArtisan * 100) / 100,
    totalMarcheMoyen: Math.round(totalMarcheMoyen * 100) / 100,
    totalMarcheMin: Math.round(totalMarcheMin * 100) / 100,
    totalMarcheMax: Math.round(totalMarcheMax * 100) / 100,
    ecartEuros: Math.round((totalArtisan - totalMarcheMoyen) * 100) / 100,
    ecartPourcent,
    verdict,
    warnings: extraction.warnings || [],
  }
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test priceAnalyzer`
Expected: tous PASS. Si un test échoue à cause de valeurs exactes différentes (notamment classifyLine boundary ou coefficient), ajuster les chiffres attendus au calcul réel.

- [ ] **Step 5: Commit**

```bash
git add src/utils/priceAnalyzer.js tests/priceAnalyzer.test.js
git commit -m "feat: rewrite priceAnalyzer with fourniture/pose logic and multi-pieces"
```

---

## Task 9: Étendre `surfaceCalculator.js` multi-pièces

**Files:**
- Modify: `src/utils/surfaceCalculator.js` (remplacement intégral)
- Create: `tests/surfaceCalculator.test.js`

- [ ] **Step 1: Lire le surfaceCalculator actuel**

Run: `cat src/utils/surfaceCalculator.js | head -30`

- [ ] **Step 2: Écrire le test qui échoue**

Créer `tests/surfaceCalculator.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { computePieceSurfaces, defaultSurfaceForType } from '../src/utils/surfaceCalculator.js'

describe('computePieceSurfaces', () => {
  it('calcule sol, murs, plafond, périmètre à partir des dimensions', () => {
    const surfaces = computePieceSurfaces({
      type: 'salle_de_bain',
      dimensions: { longueur: 3, largeur: 2, hauteur: 2.5 },
    })
    expect(surfaces.sol).toBe(6)
    expect(surfaces.plafond).toBe(6)
    expect(surfaces.perimetre).toBe(10)
    expect(surfaces.murs).toBe(25) // 10 * 2.5
  })

  it('utilise les surfaces moyennes par défaut si dimensions null', () => {
    const surfaces = computePieceSurfaces({
      type: 'salle_de_bain',
      dimensions: null,
    })
    expect(surfaces.sol).toBeGreaterThan(0)
    expect(surfaces.murs).toBeGreaterThan(0)
    expect(surfaces._default).toBe(true)
  })
})

describe('defaultSurfaceForType', () => {
  it('salle_de_bain = 5m² sol', () => {
    expect(defaultSurfaceForType('salle_de_bain').sol).toBe(5)
  })

  it('cuisine = 10m² sol', () => {
    expect(defaultSurfaceForType('cuisine').sol).toBe(10)
  })

  it('salon = 25m² sol', () => {
    expect(defaultSurfaceForType('salon').sol).toBe(25)
  })

  it('type inconnu = fallback 15m²', () => {
    expect(defaultSurfaceForType('inexistant').sol).toBe(15)
  })
})
```

- [ ] **Step 3: Lancer, vérifier échec**

Run: `npm test surfaceCalculator`
Expected: FAIL — fonctions non définies.

- [ ] **Step 4: Remplacer `src/utils/surfaceCalculator.js`**

```js
const DEFAULT_SURFACES = {
  salle_de_bain: { sol: 5, murs: 22, plafond: 5, perimetre: 9, hauteur: 2.4 },
  cuisine:       { sol: 10, murs: 32, plafond: 10, perimetre: 13, hauteur: 2.5 },
  salon:         { sol: 25, murs: 55, plafond: 25, perimetre: 22, hauteur: 2.5 },
  chambre:       { sol: 12, murs: 36, plafond: 12, perimetre: 14, hauteur: 2.5 },
  wc:            { sol: 2, murs: 12, plafond: 2, perimetre: 6, hauteur: 2.4 },
  entree:        { sol: 4, murs: 18, plafond: 4, perimetre: 8, hauteur: 2.5 },
  toiture:       { sol: 80, murs: 0, plafond: 80, perimetre: 40, hauteur: 0 },
  facade:        { sol: 0, murs: 100, plafond: 0, perimetre: 40, hauteur: 2.5 },
}

export function defaultSurfaceForType(type) {
  return DEFAULT_SURFACES[type] || { sol: 15, murs: 40, plafond: 15, perimetre: 16, hauteur: 2.5 }
}

export function computePieceSurfaces(piece) {
  const { dimensions } = piece
  if (!dimensions || !dimensions.longueur || !dimensions.largeur) {
    return { ...defaultSurfaceForType(piece.type), _default: true }
  }
  const L = Number(dimensions.longueur)
  const l = Number(dimensions.largeur)
  const h = Number(dimensions.hauteur) || 2.5
  const sol = Math.round(L * l * 100) / 100
  const perimetre = Math.round(2 * (L + l) * 100) / 100
  const murs = Math.round(perimetre * h * 100) / 100
  return {
    sol,
    plafond: sol,
    perimetre,
    murs,
    hauteur: h,
    _default: false,
  }
}

/**
 * Prend un objet extraction (réponse Claude) et enrichit chaque pièce
 * avec ses surfaces calculées ou par défaut.
 */
export function enrichPiecesWithSurfaces(extraction) {
  const pieces = (extraction.pieces || []).map(p => ({
    ...p,
    surfaces: p.surfaces && !isEmpty(p.surfaces) ? p.surfaces : computePieceSurfaces(p),
  }))
  return { ...extraction, pieces }
}

function isEmpty(obj) {
  return !obj || Object.keys(obj).length === 0
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test surfaceCalculator`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/surfaceCalculator.js tests/surfaceCalculator.test.js
git commit -m "feat: extend surfaceCalculator for multi-pieces with defaults"
```

---

## Task 10: Composant `DetectedInfo`

**Files:**
- Create: `src/components/DetectedInfo.jsx`
- Modify: `src/App.css` (ajout styles)

- [ ] **Step 1: Créer `src/components/DetectedInfo.jsx`**

```jsx
import { useState } from 'react'

/**
 * Affiche les infos extraites du devis (pièces, code postal).
 * Édition possible — déclenche `onRecompute` avec la nouvelle extraction.
 */
export default function DetectedInfo({ extraction, onRecompute }) {
  const [codePostal, setCodePostal] = useState(extraction.codePostal || '')
  const [pieces, setPieces] = useState(extraction.pieces || [])
  const [dirty, setDirty] = useState(false)

  function updatePieceDim(pieceId, key, value) {
    setPieces(prev => prev.map(p => {
      if (p.id !== pieceId) return p
      const dimensions = { ...(p.dimensions || {}) }
      dimensions[key] = value === '' ? null : Number(value)
      return { ...p, dimensions }
    }))
    setDirty(true)
  }

  function handleRecompute() {
    onRecompute({ ...extraction, codePostal: codePostal || null, pieces })
    setDirty(false)
  }

  return (
    <section className="detected-info">
      <h3>Infos détectées</h3>

      <div className="detected-row">
        <label>
          Code postal du chantier
          <input
            type="text"
            value={codePostal}
            onChange={e => { setCodePostal(e.target.value); setDirty(true) }}
            placeholder="Non détecté"
          />
        </label>
      </div>

      <div className="detected-pieces">
        {pieces.length === 0 && <p className="muted">Aucune pièce détectée.</p>}
        {pieces.map(piece => (
          <div key={piece.id} className="detected-piece">
            <strong>{piece.nom || piece.type}</strong>
            <span className="badge">{piece.type}</span>
            <div className="dims">
              <label>L (m)
                <input type="number" step="0.1" value={piece.dimensions?.longueur ?? ''}
                  onChange={e => updatePieceDim(piece.id, 'longueur', e.target.value)} />
              </label>
              <label>l (m)
                <input type="number" step="0.1" value={piece.dimensions?.largeur ?? ''}
                  onChange={e => updatePieceDim(piece.id, 'largeur', e.target.value)} />
              </label>
              <label>h (m)
                <input type="number" step="0.1" value={piece.dimensions?.hauteur ?? ''}
                  onChange={e => updatePieceDim(piece.id, 'hauteur', e.target.value)} />
              </label>
            </div>
            {piece.surfaces?._default && (
              <p className="warn-text">Dimensions non détectées — surfaces moyennes appliquées.</p>
            )}
          </div>
        ))}
      </div>

      {dirty && (
        <button className="btn primary" onClick={handleRecompute}>
          Recalculer avec ces infos
        </button>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Ajouter les styles minimaux en fin de `src/App.css`**

```css
.detected-info { background: #f6f7f9; border: 1px solid #e0e3e8; border-radius: 8px; padding: 16px; margin: 16px 0; }
.detected-info h3 { margin-top: 0; }
.detected-row { margin-bottom: 12px; }
.detected-row label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
.detected-row input { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; }
.detected-pieces { display: flex; flex-direction: column; gap: 12px; }
.detected-piece { background: white; padding: 12px; border-radius: 6px; border: 1px solid #eee; }
.detected-piece .badge { display: inline-block; background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px; }
.detected-piece .dims { display: flex; gap: 12px; margin-top: 8px; }
.detected-piece .dims label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.detected-piece .dims input { width: 70px; padding: 4px 6px; }
.warn-text { color: #b45309; font-size: 13px; margin-top: 8px; }
.muted { color: #888; font-size: 14px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DetectedInfo.jsx src/App.css
git commit -m "feat: add DetectedInfo component for editable extraction display"
```

---

## Task 11: Composant `AnomalyCard` et refonte `AnalysisReport`

**Files:**
- Create: `src/components/AnomalyCard.jsx`
- Modify: `src/components/AnalysisReport.jsx` (remplacement intégral)
- Modify: `src/App.css` (ajout styles)

- [ ] **Step 1: Créer `src/components/AnomalyCard.jsx`**

```jsx
const TYPE_LABEL = {
  fourniture_et_pose: 'Fourniture + pose',
  pose_seule: 'Pose seule',
  fourniture_seule: 'Fourniture seule',
}

const VERDICT_STYLE = {
  bad: { color: '#b91c1c', label: 'Anomalie' },
  warn: { color: '#b45309', label: 'À surveiller' },
  low: { color: '#1d4ed8', label: 'Prix bas' },
  ok: { color: '#15803d', label: 'Conforme' },
  unknown: { color: '#6b7280', label: 'Non analysable' },
}

function formatEuro(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function AnomalyCard({ line }) {
  const style = VERDICT_STYLE[line.verdict] || VERDICT_STYLE.unknown

  return (
    <article className="anomaly-card" style={{ borderLeftColor: style.color }}>
      <header>
        <span className="verdict-badge" style={{ background: style.color }}>{style.label}</span>
        {line.typePrestation && (
          <span className="type-badge">{TYPE_LABEL[line.typePrestation] || line.typePrestation}</span>
        )}
        <strong className="line-num">Ligne {line.numero}</strong>
      </header>
      <p className="designation">{line.designation}</p>
      <div className="numbers">
        <div>
          <span className="label">Quantité</span>
          <span>{line.quantite} {line.unite}</span>
        </div>
        <div>
          <span className="label">Prix artisan</span>
          <span className="artisan">{formatEuro(line.montantHT)}</span>
        </div>
        {line.prixMarche && (
          <>
            <div>
              <span className="label">Fourchette marché</span>
              <span>{formatEuro(line.prixMarche.fourchetteMin)} – {formatEuro(line.prixMarche.fourchetteMax)}</span>
            </div>
            <div>
              <span className="label">Écart</span>
              <span className="ecart">{line.ecartPourcent > 0 ? '+' : ''}{line.ecartPourcent}%</span>
            </div>
          </>
        )}
      </div>
      {line.raisonNonMatch && (
        <p className="reason">{
          line.raisonNonMatch === 'poste_non_identifie'
            ? "Ce poste n'a pas pu être identifié dans la base de prix."
            : "Poste identifié mais introuvable dans la base."
        }</p>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Remplacer `src/components/AnalysisReport.jsx`**

```jsx
import { useState } from 'react'
import AnomalyCard from './AnomalyCard'
import DetectedInfo from './DetectedInfo'

function formatEuro(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const VERDICT_BANNER = {
  ok: { text: '✓ Devis conforme au marché', color: '#15803d' },
  warn: { text: '⚠ Quelques lignes à surveiller', color: '#b45309' },
  bad: { text: '⚠ Devis problématique', color: '#b91c1c' },
}

export default function AnalysisReport({ analysis, extraction, onRecompute, onReset }) {
  const [showConformes, setShowConformes] = useState(false)

  const anomalies = analysis.lines.filter(l => l.verdict === 'bad' || l.verdict === 'warn' || l.verdict === 'low')
  const conformes = analysis.lines.filter(l => l.verdict === 'ok')
  const nonAnalysables = analysis.lines.filter(l => l.verdict === 'unknown')

  const banner = VERDICT_BANNER[analysis.verdict] || VERDICT_BANNER.ok
  const anomalyCount = anomalies.length

  return (
    <div className="analysis-report">
      <div className="verdict-banner" style={{ background: banner.color }}>
        <h2>{anomalyCount > 0 ? `${anomalyCount} ligne${anomalyCount > 1 ? 's' : ''} à surveiller` : banner.text}</h2>
      </div>

      <div className="summary">
        <div><span className="label">Total artisan</span><strong>{formatEuro(analysis.totalArtisan)}</strong></div>
        <div><span className="label">Fourchette marché</span><strong>{formatEuro(analysis.totalMarcheMin)} – {formatEuro(analysis.totalMarcheMax)}</strong></div>
        <div><span className="label">Écart</span><strong className={analysis.ecartPourcent > 10 ? 'warn' : ''}>{analysis.ecartPourcent > 0 ? '+' : ''}{analysis.ecartPourcent}%</strong></div>
      </div>

      <DetectedInfo extraction={extraction} onRecompute={onRecompute} />

      {anomalies.length > 0 && (
        <section>
          <h3>Lignes à surveiller</h3>
          {anomalies.map(l => <AnomalyCard key={l.numero} line={l} />)}
        </section>
      )}

      {conformes.length > 0 && (
        <section>
          <h3 onClick={() => setShowConformes(v => !v)} className="clickable">
            Lignes conformes ({conformes.length}) {showConformes ? '▾' : '▸'}
          </h3>
          {showConformes && conformes.map(l => <AnomalyCard key={l.numero} line={l} />)}
        </section>
      )}

      {nonAnalysables.length > 0 && (
        <section>
          <h3>Non analysables ({nonAnalysables.length})</h3>
          {nonAnalysables.map(l => <AnomalyCard key={l.numero} line={l} />)}
        </section>
      )}

      <footer className="report-footer">
        <p>Prix indicatifs ±15%. Cet outil signale les anomalies, ne certifie pas le prix juste.</p>
        <button className="btn" onClick={onReset}>Analyser un autre devis</button>
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Ajouter les styles en fin de `src/App.css`**

```css
.analysis-report section { margin-bottom: 24px; }
.analysis-report .clickable { cursor: pointer; user-select: none; }
.verdict-banner { color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; }
.verdict-banner h2 { margin: 0; }
.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.summary > div { background: #f6f7f9; padding: 16px; border-radius: 8px; }
.summary .label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
.summary strong { font-size: 20px; }
.summary strong.warn { color: #b45309; }
.anomaly-card { background: white; border: 1px solid #e0e3e8; border-left: 4px solid; border-radius: 6px; padding: 14px; margin-bottom: 12px; }
.anomaly-card header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.anomaly-card .verdict-badge { color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; }
.anomaly-card .type-badge { background: #eef; color: #334; font-size: 11px; padding: 2px 8px; border-radius: 12px; }
.anomaly-card .line-num { margin-left: auto; color: #888; font-size: 12px; }
.anomaly-card .designation { margin: 8px 0; font-size: 14px; }
.anomaly-card .numbers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 13px; }
.anomaly-card .numbers .label { display: block; font-size: 11px; color: #888; }
.anomaly-card .artisan { font-weight: bold; }
.anomaly-card .ecart { font-weight: bold; }
.anomaly-card .reason { font-size: 12px; color: #888; margin-top: 8px; font-style: italic; }
.report-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e3e8; font-size: 13px; color: #666; }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/AnomalyCard.jsx src/components/AnalysisReport.jsx src/App.css
git commit -m "feat: refactor AnalysisReport with anomaly-oriented output"
```

---

## Task 12: Refonte `App.jsx` — flow simplifié

**Files:**
- Modify: `src/App.jsx` (remplacement intégral)
- Modify: `src/components/UploadZone.jsx`

- [ ] **Step 1: Remplacer `src/App.jsx`**

```jsx
import { useState } from 'react'
import './App.css'
import UploadZone from './components/UploadZone'
import AnalysisReport from './components/AnalysisReport'
import RoomList from './components/RoomList'
import { extractPdfText } from './utils/pdfExtractor'
import { analyzeDevis } from './utils/priceAnalyzer'
import { enrichPiecesWithSurfaces } from './utils/surfaceCalculator'
import prixBTP from './data/prixBTP.json'

const STEPS = { UPLOAD: 1, LOADING: 2, RESULTS: 3, FALLBACK_DIMS: 4, ERROR: 5 }

function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [loadingStage, setLoadingStage] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleUpload(file) {
    setStep(STEPS.LOADING)
    setLoadingStage('Lecture du PDF…')
    try {
      const { fullText, numPages } = await extractPdfText(file)
      if (!fullText || fullText.length < 50) {
        setErrorMsg('Ce PDF semble être un scan. L\'OCR n\'est pas encore supporté.')
        setStep(STEPS.ERROR)
        return
      }

      setLoadingStage(`Analyse des ${numPages} page${numPages > 1 ? 's' : ''} via IA…`)
      const res = await fetch('/api/analyze-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMsg(err.error || 'Analyse impossible. Réessaie dans quelques instants.')
        setStep(STEPS.ERROR)
        return
      }
      const raw = await res.json()

      setLoadingStage('Vérification des prix marché…')
      const enriched = enrichPiecesWithSurfaces(raw)
      setExtraction(enriched)
      setAnalysis(analyzeDevis(enriched, prixBTP))
      setStep(STEPS.RESULTS)
    } catch (err) {
      console.error(err)
      setErrorMsg('Erreur inattendue. Vérifie le fichier et réessaie.')
      setStep(STEPS.ERROR)
    }
  }

  function handleRecompute(updatedExtraction) {
    const enriched = enrichPiecesWithSurfaces(updatedExtraction)
    setExtraction(enriched)
    setAnalysis(analyzeDevis(enriched, prixBTP))
  }

  function handleReset() {
    setStep(STEPS.UPLOAD)
    setExtraction(null)
    setAnalysis(null)
    setErrorMsg('')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">€</span>
          <span className="logo-text">DevisCheck</span>
        </div>
        <p className="tagline">Upload ton devis, on signale les anomalies</p>
      </header>

      <main className="app-main">
        {step === STEPS.UPLOAD && <UploadZone onFile={handleUpload} />}

        {step === STEPS.LOADING && (
          <div className="loading">
            <div className="spinner" />
            <p>{loadingStage}</p>
          </div>
        )}

        {step === STEPS.RESULTS && analysis && (
          <AnalysisReport
            analysis={analysis}
            extraction={extraction}
            onRecompute={handleRecompute}
            onReset={handleReset}
          />
        )}

        {step === STEPS.ERROR && (
          <div className="error-box">
            <h2>Quelque chose s'est mal passé</h2>
            <p>{errorMsg}</p>
            <button className="btn primary" onClick={handleReset}>Réessayer</button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>DevisCheck — Analyse gratuite de devis BTP — Prix marché 2026 indicatifs ±15%</p>
      </footer>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Remplacer `src/components/UploadZone.jsx` (remplacement intégral)**

```jsx
import { useState } from 'react'

export default function UploadZone({ onFile }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file) {
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Le fichier doit être au format PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier dépasse 10 Mo.')
      return
    }
    onFile(file)
  }

  return (
    <div
      className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        handleFile(e.dataTransfer.files[0])
      }}
    >
      <div className="upload-icon">📄</div>
      <h2>Dépose ton devis PDF ici</h2>
      <p>ou</p>
      <label className="btn primary">
        Choisir un fichier
        <input
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <p className="hint">Format PDF, 10 Mo max. L'analyse est automatique.</p>
    </div>
  )
}
```

Vérifier que les styles existants pour `.upload-zone` sont toujours compatibles dans `src/App.css`. Si `.upload-zone` n'existe pas, ajouter en fin de fichier :

```css
.upload-zone { border: 2px dashed #c0c8d6; border-radius: 12px; padding: 48px 24px; text-align: center; background: #fafbfc; transition: all 0.2s; }
.upload-zone.drag-over { border-color: #1a73e8; background: #e8f0fe; }
.upload-zone .upload-icon { font-size: 48px; margin-bottom: 12px; }
.upload-zone h2 { margin: 12px 0 8px; }
.upload-zone .hint { color: #888; font-size: 13px; margin-top: 16px; }
.upload-zone .error-text { color: #b91c1c; font-size: 14px; margin-top: 12px; }
```

- [ ] **Step 3: Ajouter les styles loading/error en fin de `src/App.css`**

```css
.loading { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; }
.loading .spinner { width: 40px; height: 40px; border: 4px solid #e0e3e8; border-top-color: #1a73e8; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 24px; text-align: center; }
.error-box h2 { color: #b91c1c; margin-top: 0; }
.btn { padding: 10px 20px; border-radius: 6px; border: 1px solid #ccc; background: white; cursor: pointer; font-size: 14px; }
.btn.primary { background: #1a73e8; color: white; border-color: #1a73e8; }
.btn:hover { opacity: 0.9; }
```

- [ ] **Step 4: Build local pour vérifier l'absence d'erreur**

Run: `npm run build`
Expected: build réussi sans erreur TypeScript/import. Les warnings de taille sont acceptables.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/UploadZone.jsx src/App.css
git commit -m "feat: simplify App flow to auto-trigger analysis after upload"
```

---

## Task 13: Page méthodologie

**Files:**
- Create: `src/components/MethodologyPage.jsx`
- Modify: `src/App.jsx` (ajout lien + route simple)
- Modify: `src/App.css`

- [ ] **Step 1: Créer `src/components/MethodologyPage.jsx`**

```jsx
import prixBTP from '../data/prixBTP.json'

export default function MethodologyPage({ onBack }) {
  return (
    <div className="methodology">
      <button className="btn" onClick={onBack}>← Retour</button>
      <h2>Méthodologie et sources</h2>

      <h3>D'où viennent les prix affichés ?</h3>
      <p>
        Les prix marché utilisés comme référence proviennent d'une base de données
        interne générée via IA (Claude) à partir de connaissances publiques sur les
        prix BTP France 2025-2026. Les fourchettes sont ensuite relues et validées
        manuellement, poste par poste.
      </p>

      <h3>Pourquoi des fourchettes et pas un prix unique ?</h3>
      <p>
        Même les bases professionnelles payantes (Batiprix, ArtiPrix) affichent
        des marges de ±10 à 15%. Le prix "vrai" dépend de variables qu'aucune base
        ne peut capturer : état du support existant, accessibilité du chantier,
        saisonnalité, relation artisan-client, choix exact des matériaux. Un outil
        qui prétendrait donner "le vrai prix" serait malhonnête.
      </p>

      <h3>Comment DevisCheck utilise ces prix ?</h3>
      <ul>
        <li>Chaque ligne est rattachée à un poste précis de la base</li>
        <li>Selon la prestation (fourniture+pose / pose seule / fourniture seule), seul le coût concerné est comparé</li>
        <li>Un coefficient régional est appliqué selon le code postal du chantier</li>
        <li>L'écart avec la fourchette marché est calculé et classé en catégories : conforme, à surveiller, anomalie</li>
      </ul>

      <h3>Limites connues</h3>
      <ul>
        <li>Les PDF scannés (images) ne sont pas encore supportés</li>
        <li>L'analyse dépend de la qualité de détection automatique des pièces</li>
        <li>Les devis de secteurs spécialisés (ERP, tertiaire) ne sont pas couverts</li>
      </ul>

      <h3>Informations techniques</h3>
      <p>
        Version de la base : <code>{prixBTP.metadata.version}</code><br />
        Dernière mise à jour : <code>{prixBTP.metadata.date_maj}</code><br />
        Région de référence : <code>{prixBTP.metadata.region_base}</code><br />
        Source : <code>{prixBTP.metadata.source}</code>
      </p>

      <h3>Avertissement légal</h3>
      <p className="legal">
        DevisCheck ne certifie pas le prix d'un devis. Il signale des écarts avec
        des fourchettes marché indicatives pour t'aider à poser les bonnes questions
        à ton artisan. L'outil ne remplace pas le conseil d'un professionnel.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Intégrer la page dans `App.jsx`**

Dans `App.jsx`, ajouter :

```jsx
// En haut, import
import MethodologyPage from './components/MethodologyPage'

// Dans le state
const [showMethodology, setShowMethodology] = useState(false)

// Dans le return, avant `<main>`, gérer le mode méthodologie :
if (showMethodology) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="logo"><span className="logo-icon">€</span><span className="logo-text">DevisCheck</span></div>
      </header>
      <main className="app-main">
        <MethodologyPage onBack={() => setShowMethodology(false)} />
      </main>
    </div>
  )
}

// Et dans le footer, remplacer le <p> par :
<footer className="app-footer">
  <p>DevisCheck — Analyse gratuite de devis BTP — <button className="link-btn" onClick={() => setShowMethodology(true)}>Méthodologie</button></p>
</footer>
```

- [ ] **Step 3: Styles**

```css
.methodology { max-width: 720px; margin: 0 auto; padding: 20px; }
.methodology h3 { margin-top: 24px; }
.methodology .legal { color: #666; font-style: italic; font-size: 13px; }
.methodology code { background: #f6f7f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.link-btn { background: none; border: none; color: #1a73e8; cursor: pointer; text-decoration: underline; padding: 0; font: inherit; }
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add src/components/MethodologyPage.jsx src/App.jsx src/App.css
git commit -m "feat: add methodology page with sources and legal disclaimer"
```

---

## Task 14: Tests d'intégration avec mock de l'API

**Files:**
- Create: `tests/integration/analyze.test.js`
- Create: `tests/fixtures/mock-responses/simple-sdb.json`

- [ ] **Step 1: Créer une fixture de réponse mockée**

`tests/fixtures/mock-responses/simple-sdb.json` :

```json
{
  "codePostal": "93200",
  "ville": "Saint-Denis",
  "pieces": [
    {
      "id": "p1",
      "type": "salle_de_bain",
      "nom": "Salle de bain",
      "dimensions": { "longueur": 2.5, "largeur": 2, "hauteur": 2.4 },
      "surfaces": null,
      "lineIds": [1, 2]
    }
  ],
  "lines": [
    {
      "numero": 1,
      "designation": "Fourniture et pose de carrelage grès cérame sol",
      "quantite": 5,
      "unite": "m²",
      "prixUnitaire": 85,
      "montantHT": 425,
      "typePrestation": "fourniture_et_pose",
      "poste": "postes_transverses.carrelage.sol_gres_cerame",
      "pieceId": "p1",
      "confidence": 0.9
    },
    {
      "numero": 2,
      "designation": "Peinture murs deux couches",
      "quantite": 22,
      "unite": "m²",
      "prixUnitaire": 30,
      "montantHT": 660,
      "typePrestation": "fourniture_et_pose",
      "poste": "postes_transverses.peinture.peinture_murs_2couches",
      "pieceId": "p1",
      "confidence": 0.95
    }
  ],
  "totalHT": 1085,
  "warnings": []
}
```

- [ ] **Step 2: Écrire le test d'intégration**

`tests/integration/analyze.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { analyzeDevis } from '../../src/utils/priceAnalyzer.js'
import { enrichPiecesWithSurfaces } from '../../src/utils/surfaceCalculator.js'
import prixBTP from '../../src/data/prixBTP.json'
import mockResponse from '../fixtures/mock-responses/simple-sdb.json'

describe('Integration: full pipeline from Claude response to analysis', () => {
  it('analyse une sdb 5m² avec carrelage + peinture', () => {
    const enriched = enrichPiecesWithSurfaces(mockResponse)
    const analysis = analyzeDevis(enriched, prixBTP)

    expect(analysis.totalArtisan).toBe(1085)
    expect(analysis.coefficient).toBe(1.00) // 93 → IDF hors Paris
    expect(analysis.lines).toHaveLength(2)

    const carrelage = analysis.lines.find(l => l.numero === 1)
    expect(carrelage.matched).toBe(true)
    // (20 + 65) * 1.00 * 5 = 425 → ok
    expect(carrelage.prixMarche.prixMoyen).toBe(425)
    expect(carrelage.verdict).toBe('ok')

    const peinture = analysis.lines.find(l => l.numero === 2)
    expect(peinture.matched).toBe(true)
    // (8 + 22) * 1.00 * 22 = 660 → ok
    expect(peinture.verdict).toBe('ok')
  })

  it('détecte une anomalie quand le prix est surévalué', () => {
    const inflated = {
      ...mockResponse,
      lines: mockResponse.lines.map(l => l.numero === 1 ? { ...l, prixUnitaire: 200, montantHT: 1000 } : l),
    }
    const enriched = enrichPiecesWithSurfaces(inflated)
    const analysis = analyzeDevis(enriched, prixBTP)
    const carrelage = analysis.lines.find(l => l.numero === 1)
    expect(['warn', 'bad']).toContain(carrelage.verdict)
  })
})
```

- [ ] **Step 3: Lancer les tests**

Run: `npm test integration`
Expected: PASS. Si les assertions de chiffres exacts échouent, ajuster selon les vraies valeurs de `prixBTP.json` seedé en Task 6.

- [ ] **Step 4: Commit**

```bash
git add tests/integration tests/fixtures
git commit -m "test: add integration tests with mocked Claude responses"
```

---

## Task 15: README et doc opérateur

**Files:**
- Modify: `README.md` (remplacement intégral)

- [ ] **Step 1: Remplacer `README.md`**

```markdown
# DevisCheck

Vérificateur de devis BTP pour particuliers. Upload un PDF, l'app détecte automatiquement les pièces, les métrés, le code postal, le type de prestation (fourniture/pose) et compare chaque ligne à des fourchettes de prix marché.

## Stack

- **Frontend** : React 19 + Vite 8
- **Backend** : Vercel Functions Node (`api/analyze-devis.js`)
- **IA** : Claude Sonnet 4.5 via Anthropic SDK
- **Tests** : Vitest

## Dev local

```bash
# 1. Installer
npm install

# 2. Configurer la clé Claude
cp .env.local.example .env.local
# Éditer .env.local et coller ta clé ANTHROPIC_API_KEY

# 3. Lancer avec Vercel dev (nécessaire pour que /api/* fonctionne)
npx vercel dev
```

Note : `npm run dev` lance Vite seul SANS la Vercel Function — l'analyse échouera. Utilise `vercel dev`.

## Tests

```bash
npm test            # run once
npm run test:watch  # watch mode
```

## Régénérer la base de prix

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node scripts/generatePrixBTP.js
# → produit src/data/prixBTP.next.json
# Relire le fichier, comparer avec prixBTP.json (git diff), puis :
mv src/data/prixBTP.next.json src/data/prixBTP.json
# Passer manuellement reviewed: true sur les entrées validées
```

## Déploiement

Push sur `main` → Vercel build automatique. Variable d'env `ANTHROPIC_API_KEY` à configurer dans Settings → Environment Variables (Production + Preview).

## Architecture

Voir `docs/superpowers/specs/2026-04-12-devischeck-refonte-design.md` pour le détail.

## Limites connues

- PDF scannés non supportés (pas d'OCR)
- Prix indicatifs ±15%, cet outil ne certifie pas un prix
- Secteurs ERP/tertiaire non couverts
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with new setup and usage"
```

---

## Task 16: Build final et vérification manuelle

- [ ] **Step 1: Build production**

Run: `npm run build`
Expected: build OK, bundle généré dans `dist/`.

- [ ] **Step 2: Lancer tous les tests**

Run: `npm test`
Expected: tous les tests PASS.

- [ ] **Step 3: Vérifier manuellement avec `vercel dev`**

```bash
vercel dev
```

Ouvrir `http://localhost:3000`, uploader un devis PDF de test, vérifier :
- Le loading s'affiche avec les 3 étapes
- Les pièces et le code postal sont détectés
- Les lignes sont classées correctement par verdict
- Le bouton "Recalculer" applique bien les modifications locales
- La page Méthodologie est accessible depuis le footer

Si des bugs apparaissent, les corriger dans des commits séparés avant de considérer la tâche terminée.

- [ ] **Step 4: Commit éventuel des fixes**

```bash
git add .
git commit -m "fix: <description du fix>"
```

- [ ] **Step 5: Push et déploiement Vercel**

```bash
git push origin main
```

Vérifier que le build Vercel passe et que l'app en prod fonctionne avec la vraie clé API configurée côté Vercel.

---

## Notes finales

- **Dépendance critique** : `ANTHROPIC_API_KEY` doit être configurée dans Vercel AVANT le premier déploiement, sinon l'app rendra un 502 à chaque analyse.
- **Coût estimé** : ~0,003–0,008 € par devis analysé (Sonnet 4.5, prompt caching actif).
- **Rate limit** : 10 requêtes/min par IP (en mémoire, naïf — si besoin plus robuste, utiliser Upstash Redis).
- **La base de prix est un seed minimal** : elle devra être régénérée via `scripts/generatePrixBTP.js` puis relue manuellement avant la v2 publique. Les pièces `salon`, `chambre`, `wc`, `entree`, `toiture`, `facade` ont des `postes_specifiques` vides et doivent être remplies.
