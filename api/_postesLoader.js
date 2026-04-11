import prixBTP from '../src/data/prixBTP.json' with { type: 'json' }

/**
 * Retourne la liste aplatie des chemins de postes disponibles.
 * Ex: ["postes_transverses.peinture.peinture_murs_2couches", ...]
 *
 * Tolère l'absence des sections (retourne liste vide si structure v1).
 * @returns {string[]}
 */
export function listAvailablePostes() {
  const paths = []

  const transverses = prixBTP.postes_transverses || {}
  for (const [cat, postes] of Object.entries(transverses)) {
    if (!postes || typeof postes !== 'object') continue
    for (const posteName of Object.keys(postes)) {
      paths.push(`postes_transverses.${cat}.${posteName}`)
    }
  }

  const pieces = prixBTP.pieces || {}
  for (const [pieceType, pieceData] of Object.entries(pieces)) {
    if (!pieceData || typeof pieceData !== 'object') continue
    const spec = pieceData.postes_specifiques || {}
    for (const [cat, postes] of Object.entries(spec)) {
      if (!postes || typeof postes !== 'object') continue
      for (const posteName of Object.keys(postes)) {
        paths.push(`pieces.${pieceType}.postes_specifiques.${cat}.${posteName}`)
      }
    }
  }

  return paths
}
