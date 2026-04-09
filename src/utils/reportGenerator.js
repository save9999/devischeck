/**
 * Génère les recommandations personnalisées à partir de l'analyse.
 * @param {Object} analysis - résultat de analyzeDevis()
 * @returns {Array} - liste de recommandations
 */
export function generateRecommendations(analysis) {
  const recommendations = []

  for (const alerte of analysis.alertes) {
    recommendations.push({
      type: 'alerte',
      icon: '⚠️',
      title: alerte.type === 'dimension_impossible'
        ? 'Problème de dimensions'
        : 'Métrés manquants',
      message: alerte.message
    })
  }

  for (const line of analysis.lines) {
    if (line.verdict === 'bad') {
      recommendations.push({
        type: 'negocier',
        icon: '📐',
        title: `Négocier : ${line.designation.length > 50 ? line.designation.substring(0, 50) + '...' : line.designation}`,
        message: `Facturé ${line.montantHT.toFixed(2)} € — prix marché estimé ${line.prixMarche.toFixed(2)} € (+${line.ecartPourcent}%). Demandez un détail au m² ou à l'unité.`,
        economie: line.ecart
      })
    }
  }

  const achatsDirects = [
    { key: 'receveur', nom: 'receveur de douche', magasin: 'Leroy Merlin / Brico Dépôt', prixPublic: 220 },
    { key: 'paroi_douche', nom: 'paroi de douche', magasin: 'Leroy Merlin / Castorama', prixPublic: 280 },
    { key: 'meuble_vasque', nom: 'meuble vasque', magasin: 'IKEA / Leroy Merlin', prixPublic: 150 },
    { key: 'mitigeur_douche', nom: 'mitigeur de douche', magasin: 'Brico Dépôt / Amazon', prixPublic: 50 },
    { key: 'mitigeur_lavabo', nom: 'mitigeur lavabo', magasin: 'Brico Dépôt / Amazon', prixPublic: 40 },
    { key: 'ensemble_douche', nom: 'ensemble de douche', magasin: 'Amazon / Leroy Merlin', prixPublic: 45 }
  ]

  for (const item of achatsDirects) {
    const line = analysis.lines.find(l => l.matchKey === item.key && l.verdict !== 'ok')
    if (line) {
      const economie = line.montantHT - item.prixPublic - (line.prixMarche - (line.prixMarche * 0.4))
      if (economie > 50) {
        recommendations.push({
          type: 'achat_direct',
          icon: '🛒',
          title: `Achetez le ${item.nom} vous-même`,
          message: `Disponible à ~${item.prixPublic} € chez ${item.magasin}. Demandez à l'artisan de déduire la fourniture et de ne facturer que la pose.`,
          economie: Math.round(economie)
        })
      }
    }
  }

  const linesOk = analysis.lines.filter(l => l.verdict === 'ok')
  if (linesOk.length > 0) {
    const noms = linesOk.slice(0, 3).map(l => l.designation.substring(0, 30)).join(', ')
    recommendations.push({
      type: 'ok',
      icon: '✅',
      title: `${linesOk.length} poste(s) au prix correct`,
      message: `${noms}${linesOk.length > 3 ? '...' : ''} — ces prix sont conformes au marché.`
    })
  }

  return recommendations
}

/**
 * Génère un contre-devis aux prix marché.
 * @param {Object} analysis - résultat de analyzeDevis()
 * @returns {Object} - { lines: [...], totalHT, tva, totalTTC }
 */
export function generateCounterQuote(analysis) {
  const lines = analysis.lines
    .filter(l => l.matched)
    .map(l => ({
      designation: l.designation,
      prixMarche: l.prixMarche,
      prixArtisan: l.montantHT,
      ecart: l.ecart,
      ecartPourcent: l.ecartPourcent,
      verdict: l.verdict
    }))

  const totalHT = lines.reduce((s, l) => s + l.prixMarche, 0)
  const tvaRate = 0.10
  const tva = totalHT * tvaRate
  const totalTTC = totalHT + tva

  return {
    lines,
    totalHT: Math.round(totalHT * 100) / 100,
    tva: Math.round(tva * 100) / 100,
    totalTTC: Math.round(totalTTC * 100) / 100,
    tvaRate
  }
}
