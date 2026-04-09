import * as pdfjsLib from 'pdfjs-dist'

// Charger le worker depuis le CDN — méthode fiable quel que soit le bundler
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`

/**
 * Extrait les items texte positionnés d'un PDF, puis les regroupe en lignes
 * en utilisant la coordonnée Y (chaque rangée du tableau = même Y).
 * @param {File} file - fichier PDF uploadé
 * @returns {Promise<Array>} - tableau de lignes regroupées par Y
 */
async function extractRowsFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const allRows = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Grouper les items par coordonnée Y (arrondie pour tolérance)
    const byY = {}
    for (const item of content.items) {
      const str = item.str.trim()
      if (!str) continue
      const y = Math.round(item.transform[5])
      const x = Math.round(item.transform[4])
      if (!byY[y]) byY[y] = []
      byY[y].push({ str, x })
    }

    // Trier les lignes Y de haut en bas (Y décroissant dans un PDF)
    const yKeys = Object.keys(byY).sort((a, b) => Number(b) - Number(a))
    for (const y of yKeys) {
      // Trier les colonnes de gauche à droite
      const cols = byY[y].sort((a, b) => a.x - b.x)
      allRows.push(cols.map(c => c.str))
    }
  }

  return allRows
}

/**
 * Extrait le texte brut d'un fichier PDF (fallback).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }

  return fullText
}

/**
 * Parse un devis PDF en lignes structurées.
 * Utilise le groupement par position Y pour reconstruire les lignes du tableau.
 * @param {File} file - fichier PDF uploadé
 * @returns {Promise<Object>} - { lines: [...], totalHT: number, rawText: string }
 */
export async function parseDevisPdf(file) {
  const rows = await extractRowsFromPdf(file)

  const lines = []

  for (const cols of rows) {
    // La première colonne doit être un numéro de ligne (1-99)
    const first = cols[0]
    if (!/^\d{1,2}$/.test(first)) continue
    const numero = parseInt(first)
    if (numero === 0 || numero > 99) continue

    // Chercher les montants dans les colonnes (format: 110,00 ou 1 400,00)
    const amounts = []
    let designationParts = []
    let foundAmount = false

    for (let i = 1; i < cols.length; i++) {
      const col = cols[i]
      // Est-ce un montant ? (ex: "110,00", "1 400,00", "1,00")
      if (/^\d[\d\s]*,\d{2}$/.test(col.trim())) {
        amounts.push(col.trim())
        foundAmount = true
      } else if (!foundAmount) {
        // Avant les montants = partie de la désignation
        designationParts.push(col)
      }
    }

    if (amounts.length === 0) continue

    // Le dernier montant est le total HT
    const montantStr = amounts[amounts.length - 1].replace(/\s/g, '').replace(',', '.')
    const montantHT = parseFloat(montantStr)
    if (isNaN(montantHT) || montantHT <= 0) continue

    // Prix unitaire = avant-dernier montant si dispo
    let prixUnit = montantHT
    if (amounts.length >= 2) {
      const puStr = amounts[amounts.length - 2].replace(/\s/g, '').replace(',', '.')
      const pu = parseFloat(puStr)
      if (!isNaN(pu) && pu > 0) prixUnit = pu
    }

    const designation = designationParts.join(' ').replace(/\s+/g, ' ').trim()
    if (designation.length < 3) continue

    lines.push({
      numero,
      designation,
      quantite: prixUnit > 0 ? Math.round((montantHT / prixUnit) * 100) / 100 : 1,
      prixUnitaire: prixUnit,
      montantHT
    })
  }

  // Dédupliquer
  const seen = new Set()
  const uniqueLines = lines.filter(line => {
    const key = `${line.numero}-${line.montantHT}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const totalHT = uniqueLines.reduce((sum, l) => sum + l.montantHT, 0)

  return {
    lines: uniqueLines,
    totalHT: Math.round(totalHT * 100) / 100,
    rawText: rows.map(r => r.join(' ')).join('\n')
  }
}
