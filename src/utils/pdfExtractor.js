import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// Worker copié dans public/ — accessible à la racine du site
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

/**
 * Extrait le texte brut d'un PDF page par page.
 * Aucune tentative de parsing : on retourne le texte tel quel, ordonné
 * par position Y puis X, pour que Claude puisse le structurer.
 *
 * @param {File} file - fichier PDF uploadé
 * @returns {Promise<{ pages: string[], fullText: string, numPages: number }>}
 */
export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer)
  }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Regrouper les items par position Y (arrondie), puis trier X asc
    const byY = {}
    for (const item of content.items) {
      const str = item.str
      if (!str) continue
      const y = Math.round(item.transform[5])
      const x = Math.round(item.transform[4])
      if (!byY[y]) byY[y] = []
      byY[y].push({ str, x })
    }
    const yKeys = Object.keys(byY).sort((a, b) => Number(b) - Number(a))
    const lines = yKeys.map(y =>
      byY[y].sort((a, b) => a.x - b.x).map(c => c.str).join(' ')
    )
    pages.push(lines.join('\n'))
  }

  return {
    pages,
    fullText: pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join('\n\n'),
    numPages: pdf.numPages,
  }
}
