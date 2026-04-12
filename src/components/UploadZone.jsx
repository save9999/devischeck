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
      <div className="upload-icon">📄</div>
      <h2>Dépose ton devis PDF ici</h2>
      <p>ou</p>
      <label className="btn primary">
        Choisir un fichier
        <input
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <p className="hint">Format PDF, 10 Mo max. L'analyse est automatique.</p>
    </div>
  )
}
