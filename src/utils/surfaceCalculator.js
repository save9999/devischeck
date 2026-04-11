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
