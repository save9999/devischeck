import { useState } from 'react'

export default function UploadZone({ onFile }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file) {
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Le fichier doit être au format PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier dépasse 10 Mo.')
      return
    }
    onFile(file)
  }

  return (
    <>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files[0])
        }}
      >
        <span className="upload-icon">📋</span>
        <h2>Dépose ton devis ici</h2>
        <p>ou choisis un fichier depuis ton appareil</p>
        <label className="btn primary" style={{ marginTop: 16 }}>
          Choisir un fichier PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <p className="hint">Format PDF uniquement — 10 Mo max — Analyse en 30 secondes</p>
      </div>

      <div className="features">
        <div className="feature-item">
          <span className="feature-icon">🔍</span>
          Analyse ligne par ligne
        </div>
        <div className="feature-item">
          <span className="feature-icon">📊</span>
          Prix marché 2026
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          Confidentiel
        </div>
        <div className="feature-item">
          <span className="feature-icon">⚡</span>
          Résultat en 30s
        </div>
      </div>
    </>
  )
}
