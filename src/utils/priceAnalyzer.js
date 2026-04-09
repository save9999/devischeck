import prixBTP from '../data/prixBTP.json'

/**
 * Trouve le meilleur poste de la base de prix correspondant à une désignation.
 * @param {string} designation - texte de la ligne du devis
 * @returns {Object|null} - { key, poste, score }
 */
export function matchLineToPoste(designation) {
  const lower = designation.toLowerCase()
  let bestMatch = null
  let bestScore = 0

  for (const [key, keywords] of Object.entries(prixBTP.keywords)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = key
    }
  }

  if (!bestMatch || bestScore === 0) return null

  const poste = findPosteByKey(bestMatch)
  if (!poste) return null

  return { key: bestMatch, poste, score: bestScore }
}

function findPosteByKey(key) {
  const mapping = {
    cabine_douche: 'depose.cabine_douche',
    receveur: 'plomberie.receveur_standard',
    carrelage: 'carrelage.sol_gres_cerame',
    faience: 'carrelage.faience_murale',
    ragreage: 'preparation.ragreage_fibre',
    paroi_douche: 'plomberie.paroi_douche_fixe',
    mitigeur_douche: 'plomberie.mitigeur_douche',
    mitigeur_lavabo: 'plomberie.mitigeur_lavabo',
    peinture: 'peinture.peinture_murs_2couches',
    enduit: 'peinture.enduit_lissage',
    joint: 'finitions.joint_silicone',
    per: 'plomberie.alimentation_per',
    meuble_vasque: 'plomberie.meuble_vasque',
    vasque: 'plomberie.vasque_ceramique',
    bonde: 'plomberie.bonde_dn90',
    ensemble_douche: 'plomberie.ensemble_douche'
  }

  const path = mapping[key]
  if (!path) return null

  const [cat, posteKey] = path.split('.')
  return prixBTP.pieces.salle_de_bain?.[cat]?.[posteKey] || null
}

/**
 * Calcule le prix marché d'une ligne en fonction des surfaces réelles.
 */
export function calculateMarketPrice(poste, surfaces, matchKey) {
  const matMoy = poste.mat_moy || 0
  const moMoy = poste.mo_moy || 0
  const prixUnitaire = matMoy + moMoy

  if (poste.unite === 'u' || poste.unite === 'fft') {
    return prixUnitaire
  }

  let surface = 1
  if (poste.unite === 'm²') {
    if (matchKey === 'carrelage') {
      surface = surfaces.carrelageSol || surfaces.sol || 1
    } else if (matchKey === 'faience') {
      surface = surfaces.faienceTotal || 7
    } else if (matchKey === 'ragreage') {
      surface = surfaces.sol || 1
    } else if (matchKey === 'peinture' || matchKey === 'enduit') {
      surface = surfaces.mursPeinture || surfaces.mursNet || 1
    } else {
      surface = surfaces.sol || 1
    }
  } else if (poste.unite === 'ml') {
    if (matchKey === 'per') {
      surface = 5
    } else if (matchKey === 'joint') {
      surface = 7
    } else {
      surface = surfaces.perimetre || 1
    }
  }

  return Math.round(prixUnitaire * surface * 100) / 100
}

/**
 * Analyse complète d'un devis.
 */
export function analyzeDevis(devisLines, surfaces) {
  const analyzedLines = devisLines.map(line => {
    const match = matchLineToPoste(line.designation)

    if (!match) {
      return {
        ...line,
        matched: false,
        matchKey: null,
        prixMarche: null,
        ecart: null,
        ecartPourcent: null,
        verdict: 'unknown'
      }
    }

    const prixMarche = calculateMarketPrice(match.poste, surfaces, match.key)
    const ecart = line.montantHT - prixMarche
    const ecartPourcent = prixMarche > 0
      ? Math.round((ecart / prixMarche) * 100)
      : 0

    let verdict = 'ok'
    if (ecartPourcent > 40) verdict = 'bad'
    else if (ecartPourcent > 15) verdict = 'warn'
    else if (ecartPourcent < -15) verdict = 'low'

    return {
      ...line,
      matched: true,
      matchKey: match.key,
      prixMarche,
      ecart: Math.round(ecart * 100) / 100,
      ecartPourcent,
      verdict
    }
  })

  analyzedLines.sort((a, b) => (b.ecartPourcent || 0) - (a.ecartPourcent || 0))

  const totalArtisan = analyzedLines.reduce((s, l) => s + l.montantHT, 0)
  const totalMarche = analyzedLines
    .filter(l => l.matched)
    .reduce((s, l) => s + l.prixMarche, 0)

  const ecartGlobal = totalMarche > 0
    ? Math.round(((totalArtisan - totalMarche) / totalMarche) * 100)
    : 0

  let verdictGlobal = 'ok'
  if (ecartGlobal > 30) verdictGlobal = 'bad'
  else if (ecartGlobal > 10) verdictGlobal = 'warn'

  const allQtyOne = devisLines.every(l => l.quantite === 1)

  return {
    lines: analyzedLines,
    totalArtisan: Math.round(totalArtisan * 100) / 100,
    totalMarche: Math.round(totalMarche * 100) / 100,
    ecartEuros: Math.round((totalArtisan - totalMarche) * 100) / 100,
    ecartPourcent: ecartGlobal,
    verdict: verdictGlobal,
    alertes: [
      ...(surfaces.alertes || []),
      ...(allQtyOne ? [{
        type: 'metres_manquants',
        message: 'Toutes les quantités sont à 1 — l\'artisan n\'a pas détaillé les métrés. Les prix au m² sont invérifiables.'
      }] : [])
    ]
  }
}
