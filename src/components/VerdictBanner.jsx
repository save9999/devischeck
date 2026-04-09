export default function VerdictBanner({ analysis }) {
  const { totalArtisan, totalMarche, ecartEuros, ecartPourcent, verdict } = analysis
  const tvaTTC = totalArtisan * 1.10

  const verdictLabels = {
    ok: 'Prix correct',
    warn: 'Légèrement au-dessus du marché',
    bad: 'Devis surévalué'
  }

  const isOverpriced = ecartEuros > 0

  return (
    <div className={`verdict-banner verdict-banner-${verdict}`}>
      <div className="verdict-main">
        <p className="verdict-savings">
          {isOverpriced
            ? <>💰 Économie possible : <strong>{ecartEuros.toFixed(0)} € HT</strong></>
            : <>✅ Ce devis est <strong>dans les prix du marché</strong></>
          }
        </p>
        <span className={`badge-${verdict}`}>{verdictLabels[verdict]}</span>
      </div>
      <div className="verdict-compare">
        <div className="verdict-col">
          <span className="verdict-label">Devis artisan</span>
          <span className="verdict-price">{totalArtisan.toFixed(0)} € HT</span>
          <span className="verdict-ttc">{tvaTTC.toFixed(0)} € TTC</span>
        </div>
        <div className="verdict-arrow">→</div>
        <div className="verdict-col">
          <span className="verdict-label">Prix marché</span>
          <span className="verdict-price verdict-ok">{totalMarche.toFixed(0)} € HT</span>
          <span className="verdict-ttc">{(totalMarche * 1.10).toFixed(0)} € TTC</span>
        </div>
        <div className="verdict-col">
          <span className="verdict-label">{isOverpriced ? 'Surfacturation' : 'Écart'}</span>
          <span className={`verdict-price verdict-${verdict}`}>
            {ecartPourcent > 0 ? '+' : ''}{ecartPourcent}%
          </span>
        </div>
      </div>
    </div>
  )
}
