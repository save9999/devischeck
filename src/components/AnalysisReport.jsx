import VerdictBanner from './VerdictBanner'
import LineAnalysis from './LineAnalysis'
import CounterQuote from './CounterQuote'
import Recommendations from './Recommendations'

export default function AnalysisReport({ analysis, onReset }) {
  return (
    <div>
      <VerdictBanner analysis={analysis} />
      <LineAnalysis lines={analysis.lines} />
      <CounterQuote analysis={analysis} />
      <Recommendations analysis={analysis} />
      <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={onReset}>
        ← Analyser un autre devis
      </button>
    </div>
  )
}
