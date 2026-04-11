import { useState } from 'react'
import AnomalyCard from './AnomalyCard'
import DetectedInfo from './DetectedInfo'

function formatEuro(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const VERDICT_BANNER = {
  ok: { text: '✓ Devis conforme au marché', color: '#15803d' },
  warn: { text: '⚠ Quelques lignes à surveiller', color: '#b45309' },
  bad: { text: '⚠ Devis problématique', color: '#b91c1c' },
}

export default function AnalysisReport({ analysis, extraction, onRecompute, onReset }) {
  const [showConformes, setShowConformes] = useState(false)

  const anomalies = analysis.lines.filter(l => l.verdict === 'bad' || l.verdict === 'warn' || l.verdict === 'low')
  const conformes = analysis.lines.filter(l => l.verdict === 'ok')
  const nonAnalysables = analysis.lines.filter(l => l.verdict === 'unknown')

  const banner = VERDICT_BANNER[analysis.verdict] || VERDICT_BANNER.ok
  const anomalyCount = anomalies.length

  return (
    <div className="analysis-report">
      <div className="verdict-banner" style={{ background: banner.color }}>
        <h2>{anomalyCount > 0 ? `${anomalyCount} ligne${anomalyCount > 1 ? 's' : ''} à surveiller` : banner.text}</h2>
      </div>

      <div className="summary">
        <div><span className="label">Total artisan</span><strong>{formatEuro(analysis.totalArtisan)}</strong></div>
        <div><span className="label">Fourchette marché</span><strong>{formatEuro(analysis.totalMarcheMin)} – {formatEuro(analysis.totalMarcheMax)}</strong></div>
        <div><span className="label">Écart</span><strong className={analysis.ecartPourcent > 10 ? 'warn' : ''}>{analysis.ecartPourcent > 0 ? '+' : ''}{analysis.ecartPourcent}%</strong></div>
      </div>

      <DetectedInfo extraction={extraction} onRecompute={onRecompute} />

      {anomalies.length > 0 && (
        <section>
          <h3>Lignes à surveiller</h3>
          {anomalies.map(l => <AnomalyCard key={l.numero} line={l} />)}
        </section>
      )}

      {conformes.length > 0 && (
        <section>
          <h3 onClick={() => setShowConformes(v => !v)} className="clickable">
            Lignes conformes ({conformes.length}) {showConformes ? '▾' : '▸'}
          </h3>
          {showConformes && conformes.map(l => <AnomalyCard key={l.numero} line={l} />)}
        </section>
      )}

      {nonAnalysables.length > 0 && (
        <section>
          <h3>Non analysables ({nonAnalysables.length})</h3>
          {nonAnalysables.map(l => <AnomalyCard key={l.numero} line={l} />)}
        </section>
      )}

      <footer className="report-footer">
        <p>Prix indicatifs ±15%. Cet outil signale les anomalies, ne certifie pas le prix juste.</p>
        <button className="btn" onClick={onReset}>Analyser un autre devis</button>
      </footer>
    </div>
  )
}
