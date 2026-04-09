import jsPDF from 'jspdf'
import VerdictBanner from './VerdictBanner'
import LineAnalysis from './LineAnalysis'
import CounterQuote from './CounterQuote'
import Recommendations from './Recommendations'
import { generateRecommendations } from '../utils/reportGenerator'

export default function AnalysisReport({ analysis, onReset }) {
  function exportPdf() {
    const doc = new jsPDF()
    const margin = 20
    let y = 20

    doc.setFontSize(20)
    doc.setTextColor(5, 150, 105)
    doc.text('DevisCheck — Analyse de votre devis', margin, y)
    y += 12

    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text(`Devis artisan : ${analysis.totalArtisan.toFixed(2)} EUR HT`, margin, y); y += 7
    doc.text(`Prix marche : ${analysis.totalMarche.toFixed(2)} EUR HT`, margin, y); y += 7
    doc.setTextColor(220, 38, 38)
    doc.text(`Surfacturation : +${analysis.ecartPourcent}% (${analysis.ecartEuros.toFixed(2)} EUR)`, margin, y); y += 12

    doc.setFontSize(14)
    doc.setTextColor(30, 30, 30)
    doc.text('Analyse ligne par ligne', margin, y); y += 8

    doc.setFontSize(9)
    for (const line of analysis.lines) {
      if (y > 270) { doc.addPage(); y = 20 }
      const icon = line.verdict === 'ok' ? '[OK]' : line.verdict === 'warn' ? '[!]' : line.verdict === 'bad' ? '[!!]' : '[?]'
      const text = `${icon} ${line.designation.substring(0, 50)} — ${line.montantHT.toFixed(2)} EUR`
      const market = line.matched ? ` (marche: ${line.prixMarche.toFixed(2)} EUR, ${line.ecartPourcent > 0 ? '+' : ''}${line.ecartPourcent}%)` : ' (non identifie)'

      if (line.verdict === 'bad') doc.setTextColor(220, 38, 38)
      else if (line.verdict === 'warn') doc.setTextColor(245, 158, 11)
      else doc.setTextColor(5, 150, 105)

      doc.text(text + market, margin, y)
      y += 5
    }

    y += 8
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(14)
    doc.setTextColor(30, 30, 30)
    doc.text('Recommandations', margin, y); y += 8

    doc.setFontSize(9)
    const recs = generateRecommendations(analysis)
    for (const rec of recs) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setTextColor(30, 30, 30)
      doc.text(`${rec.icon} ${rec.title}`, margin, y); y += 5
      doc.setTextColor(100, 100, 100)
      const msgLines = doc.splitTextToSize(rec.message, 170)
      doc.text(msgLines, margin, y); y += msgLines.length * 4 + 4
    }

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Genere par DevisCheck — Prix marche IDF 2026', margin, 285)

    doc.save('devischeck-analyse.pdf')
  }

  return (
    <div>
      <VerdictBanner analysis={analysis} />
      <LineAnalysis lines={analysis.lines} />
      <CounterQuote analysis={analysis} />
      <Recommendations analysis={analysis} />
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={exportPdf}>
          📥 Télécharger l'analyse en PDF
        </button>
        <button className="btn btn-outline" onClick={onReset}>
          ← Nouveau devis
        </button>
      </div>
    </div>
  )
}
