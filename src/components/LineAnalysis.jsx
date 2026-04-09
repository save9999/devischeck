export default function LineAnalysis({ lines }) {
  return (
    <div className="card">
      <h3 className="section-title">Analyse ligne par ligne</h3>
      <div className="lines-table">
        {lines.map((line, i) => (
          <div key={i} className={`line-row line-row-${line.verdict}`}>
            <div className="line-verdict-icon">
              {line.verdict === 'ok' && '🟢'}
              {line.verdict === 'warn' && '🟠'}
              {line.verdict === 'bad' && '🔴'}
              {line.verdict === 'unknown' && '⚪'}
              {line.verdict === 'low' && '🔵'}
            </div>
            <div className="line-info">
              <p className="line-designation">{line.designation}</p>
              <div className="line-prices">
                <span>Artisan : <strong>{line.montantHT.toFixed(2)} €</strong></span>
                {line.matched && (
                  <>
                    <span className="line-separator">→</span>
                    <span>Marché : <strong className="verdict-ok">{line.prixMarche.toFixed(2)} €</strong></span>
                    <span className={`badge-${line.verdict}`}>
                      {line.ecartPourcent > 0 ? '+' : ''}{line.ecartPourcent}%
                    </span>
                  </>
                )}
                {!line.matched && (
                  <span className="line-unmatched">Non identifié</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
