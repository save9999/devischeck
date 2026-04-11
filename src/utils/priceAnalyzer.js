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

function resolveQuantite(line) {
  const q = Number(line.quantite)
  if (Number.isFinite(q) && q > 0) return q
  return 1
}

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
  return 'ok'
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
