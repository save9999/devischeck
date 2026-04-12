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
