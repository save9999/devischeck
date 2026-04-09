import { generateCounterQuote } from '../utils/reportGenerator'

export default function CounterQuote({ analysis }) {
  const quote = generateCounterQuote(analysis)

  return (
    <div className="card">
      <h3 className="section-title">📋 Contre-devis aux prix marché</h3>
      <div className="counter-table">
        {quote.lines.map((line, i) => (
          <div key={i} className="counter-row">
            <span className="counter-designation">{line.designation}</span>
            <span className="counter-price">{line.prixMarche.toFixed(2)} €</span>
          </div>
        ))}
      </div>
      <div className="counter-totals">
        <div className="counter-total-row">
          <span>Total HT</span>
          <strong>{quote.totalHT.toFixed(2)} €</strong>
        </div>
        <div className="counter-total-row">
          <span>TVA {(quote.tvaRate * 100).toFixed(0)}%</span>
          <span>{quote.tva.toFixed(2)} €</span>
        </div>
        <div className="counter-total-row counter-total-final">
          <span>Total TTC</span>
          <strong>{quote.totalTTC.toFixed(2)} €</strong>
        </div>
      </div>
    </div>
  )
}
