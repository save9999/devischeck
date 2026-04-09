import { useState, useRef } from 'react'
import { parseDevisPdf } from '../utils/pdfExtractor'

export default function UploadZone({ onDevisLoaded }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)
  const inputRef = useRef()

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier dépasse 10 Mo.')
      return
    }

    setError(null)
    setLoading(true)
    setFileName(file.name)

    try {
      const result = await parseDevisPdf(file)

      if (result.lines.length === 0) {
        setError('Aucune ligne de devis détectée dans ce PDF. Vérifiez que le fichier contient bien un devis avec des montants.')
        setLoading(false)
        return
      }

      onDevisLoaded(result)
    } catch (err) {
      console.error('PDF parsing error:', err)
      setError(`Erreur lors de la lecture du PDF : ${err.message || 'fichier protégé ou corrompu'}`)
    }
    setLoading(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div
        className={`upload-zone ${dragging ? 'upload-zone-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {loading ? (
          <>
            <div className="upload-icon">⏳</div>
            <p className="upload-title">Analyse de {fileName}...</p>
            <p className="upload-subtitle">Extraction des lignes du devis</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📄</div>
            <p className="upload-title">Déposez votre devis PDF ici</p>
            <p className="upload-subtitle">ou cliquez pour parcourir</p>
            <p className="upload-hint">PDF uniquement • 10 Mo max</p>
          </>
        )}
      </div>
      {error && <p className="upload-error">{error}</p>}
    </div>
  )
}
