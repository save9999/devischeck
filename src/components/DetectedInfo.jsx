import { useState } from 'react'

/**
 * Affiche les infos extraites du devis (pièces, code postal).
 * Édition possible — déclenche `onRecompute` avec la nouvelle extraction.
 */
export default function DetectedInfo({ extraction, onRecompute }) {
  const [codePostal, setCodePostal] = useState(extraction.codePostal || '')
  const [pieces, setPieces] = useState(extraction.pieces || [])
  const [dirty, setDirty] = useState(false)

  function updatePieceDim(pieceId, key, value) {
    setPieces(prev => prev.map(p => {
      if (p.id !== pieceId) return p
      const dimensions = { ...(p.dimensions || {}) }
      dimensions[key] = value === '' ? null : Number(value)
      return { ...p, dimensions }
    }))
    setDirty(true)
  }

  function handleRecompute() {
    onRecompute({ ...extraction, codePostal: codePostal || null, pieces })
    setDirty(false)
  }

  return (
    <section className="detected-info">
      <h3>Infos détectées</h3>

      <div className="detected-row">
        <label>
          Code postal du chantier
          <input
            type="text"
            value={codePostal}
            onChange={e => { setCodePostal(e.target.value); setDirty(true) }}
            placeholder="Non détecté"
          />
        </label>
      </div>

      <div className="detected-pieces">
        {pieces.length === 0 && <p className="muted">Aucune pièce détectée.</p>}
        {pieces.map(piece => (
          <div key={piece.id} className="detected-piece">
            <strong>{piece.nom || piece.type}</strong>
            <span className="badge">{piece.type}</span>
            <div className="dims">
              <label>L (m)
                <input type="number" step="0.1" value={piece.dimensions?.longueur ?? ''}
                  onChange={e => updatePieceDim(piece.id, 'longueur', e.target.value)} />
              </label>
              <label>l (m)
                <input type="number" step="0.1" value={piece.dimensions?.largeur ?? ''}
                  onChange={e => updatePieceDim(piece.id, 'largeur', e.target.value)} />
              </label>
              <label>h (m)
                <input type="number" step="0.1" value={piece.dimensions?.hauteur ?? ''}
                  onChange={e => updatePieceDim(piece.id, 'hauteur', e.target.value)} />
              </label>
            </div>
            {piece.surfaces?._default && (
              <p className="warn-text">Dimensions non détectées — surfaces moyennes appliquées.</p>
            )}
          </div>
        ))}
      </div>

      {dirty && (
        <button className="btn primary" onClick={handleRecompute}>
          Recalculer avec ces infos
        </button>
      )}
    </section>
  )
}
