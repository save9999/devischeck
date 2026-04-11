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
