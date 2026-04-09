import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * Extrait le texte brut d'un fichier PDF.
 * @param {File} file - fichier PDF uploadé
 * @returns {Promise<string>} - texte brut concaténé
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
 * Parse le texte brut d'un devis en lignes structurées.
 * Cherche les patterns : N° | Désignation | Qté | Prix Unit | Montant HT
 * @param {string} text - texte brut du PDF
 * @returns {Object} - { lines: [...], totalHT: number, rawText: string }
 */
export function parseDevisText(text) {
  const lines = []
  const rawLines = text.split('\n')

  for (const raw of rawLines) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    // Chercher des montants dans la ligne (format: 110,00 ou 1 400,00)
    const amounts = trimmed.match(/\d[\d\s]*,\d{2}/g)
    if (!amounts || amounts.length < 1) continue

    // Chercher un numéro de ligne au début
    const numMatch = trimmed.match(/^(\d{1,3})\s/)
    if (!numMatch) continue

    const numero = parseInt(numMatch[1])
    if (numero === 0 || numero > 100) continue

    // Le dernier montant est le total HT de la ligne
    const montantStr = amounts[amounts.length - 1].replace(/\s/g, '').replace(',', '.')
    const montantHT = parseFloat(montantStr)
    if (isNaN(montantHT) || montantHT <= 0) continue

    // Prix unitaire si disponible (avant-dernier montant)
    let prixUnit = montantHT
    if (amounts.length >= 2) {
      const puStr = amounts[amounts.length - 2].replace(/\s/g, '').replace(',', '.')
      const pu = parseFloat(puStr)
      if (!isNaN(pu) && pu > 0) prixUnit = pu
    }

    // Désignation = tout entre le numéro et les montants
    const firstAmountIndex = trimmed.indexOf(amounts[0])
    let designation = trimmed.substring(numMatch[0].length, firstAmountIndex).trim()

    // Nettoyage de la désignation
    designation = designation.replace(/\s+/g, ' ').trim()

    if (designation.length > 5) {
      lines.push({
        numero,
        designation,
        quantite: montantHT / prixUnit || 1,
        prixUnitaire: prixUnit,
        montantHT
      })
    }
  }

  // Dédupliquer (certains PDF répètent les lignes)
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
    rawText: text
  }
}
