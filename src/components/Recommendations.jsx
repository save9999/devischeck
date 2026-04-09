import { generateRecommendations } from '../utils/reportGenerator'

export default function Recommendations({ analysis }) {
  const recs = generateRecommendations(analysis)

  const typeOrder = { alerte: 0, negocier: 1, achat_direct: 2, ok: 3 }
  recs.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])

  return (
    <div className="card">
      <h3 className="section-title">💡 Recommandations</h3>
      <div className="recs-list">
        {recs.map((rec, i) => (
          <div key={i} className={`rec-item rec-${rec.type}`}>
            <span className="rec-icon">{rec.icon}</span>
            <div className="rec-content">
              <p className="rec-title">{rec.title}</p>
              <p className="rec-message">{rec.message}</p>
              {rec.economie > 0 && (
                <p className="rec-savings">Économie estimée : ~{rec.economie.toFixed(0)} €</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
