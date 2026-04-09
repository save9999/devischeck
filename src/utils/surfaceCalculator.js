/**
 * Calcule les surfaces d'une pièce à partir de ses dimensions.
 * @param {Object} room - { longueur, largeur, hauteur, type, douche, porte, fenetre }
 * @returns {Object} - surfaces calculées
 */
export function calculateSurfaces(room) {
  const { longueur, largeur, hauteur } = room
  const sol = longueur * largeur
  const plafond = sol
  const perimetre = 2 * (longueur + largeur)
  const mursBrut = perimetre * hauteur

  const porteSurface = room.porte
    ? (room.porte.largeur * room.porte.hauteur)
    : (0.8 * 2.0)
  const fenetreSurface = room.fenetre
    ? (room.fenetre.largeur * room.fenetre.hauteur)
    : 0

  const mursNet = mursBrut - porteSurface - fenetreSurface

  const result = { sol, plafond, perimetre, mursBrut, mursNet }

  if (room.type === 'salle_de_bain' && room.douche) {
    const doucheLarg = room.douche.largeur
    const doucheProf = room.douche.profondeur
    const hauteurFaience = 2.2

    result.empriseReceveur = doucheLarg * doucheProf
    result.carrelageSol = sol - result.empriseReceveur

    const fondDouche = doucheLarg * hauteurFaience
    const retours = 2 * (doucheProf * hauteurFaience)
    result.faienceDouche = fondDouche + retours
    result.credenceVasque = 0.8 * 0.6
    result.faienceTotal = result.faienceDouche + result.credenceVasque
    result.mursPeinture = mursNet - result.faienceTotal

    result.alertes = []
    if (doucheLarg > largeur) {
      result.alertes.push({
        type: 'dimension_impossible',
        message: `Le receveur de ${(doucheLarg * 100).toFixed(0)} cm de large ne rentre pas dans une pièce de ${(largeur * 100).toFixed(0)} cm.`
      })
    }
    if (doucheProf > longueur) {
      result.alertes.push({
        type: 'dimension_impossible',
        message: `Le receveur de ${(doucheProf * 100).toFixed(0)} cm de profondeur dépasse la longueur de la pièce (${(longueur * 100).toFixed(0)} cm).`
      })
    }
  } else {
    result.carrelageSol = sol
    result.mursPeinture = mursNet
    result.faienceTotal = 0
    result.alertes = []
  }

  return result
}
