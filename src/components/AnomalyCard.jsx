const TYPE_LABEL = {
  fourniture_et_pose: 'Fourniture + pose',
  pose_seule: 'Pose seule',
  fourniture_seule: 'Fourniture seule',
}

const VERDICT_STYLE = {
  bad: { color: '#b91c1c', label: 'Anomalie' },
  warn: { color: '#b45309', label: 'À surveiller' },
  low: { color: '#1d4ed8', label: 'Prix bas' },
  ok: { color: '#15803d', label: 'Conforme' },
  unknown: { color: '#6b7280', label: 'Non analysable' },
}

function formatEuro(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function AnomalyCard({ line }) {
  const style = VERDICT_STYLE[line.verdict] || VERDICT_STYLE.unknown

  return (
    <article className="anomaly-card" style={{ borderLeftColor: style.color }}>
      <header>
        <span className="verdict-badge" style={{ background: style.color }}>{style.label}</span>
        {line.typePrestation && (
          <span className="type-badge">{TYPE_LABEL[line.typePrestation] || line.typePrestation}</span>
        )}
        <strong className="line-num">Ligne {line.numero}</strong>
      </header>
      <p className="designation">{line.designation}</p>
      <div className="numbers">
        <div>
          <span className="label">Quantité</span>
          <span>{line.quantite} {line.unite}</span>
        </div>
        <div>
          <span className="label">Prix artisan</span>
          <span className="artisan">{formatEuro(line.montantHT)}</span>
        </div>
        {line.prixMarche && (
          <>
            <div>
              <span className="label">Fourchette marché</span>
              <span>{formatEuro(line.prixMarche.fourchetteMin)} – {formatEuro(line.prixMarche.fourchetteMax)}</span>
            </div>
            <div>
              <span className="label">Écart</span>
              <span className="ecart">{line.ecartPourcent > 0 ? '+' : ''}{line.ecartPourcent}%</span>
            </div>
          </>
        )}
      </div>
      {line.raisonNonMatch && (
        <p className="reason">{
          line.raisonNonMatch === 'poste_non_identifie'
            ? "Ce poste n'a pas pu être identifié dans la base de prix."
            : "Poste identifié mais introuvable dans la base."
        }</p>
      )}
    </article>
  )
}
