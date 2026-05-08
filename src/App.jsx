import { useState } from 'react'
import './App.css'
import UploadZone from './components/UploadZone'
import AnalysisReport from './components/AnalysisReport'
import MethodologyPage from './components/MethodologyPage'
import { extractPdfText } from './utils/pdfExtractor'
import { analyzeDevis } from './utils/priceAnalyzer'
import { enrichPiecesWithSurfaces } from './utils/surfaceCalculator'
import prixBTP from './data/prixBTP.json'

const STEPS = { UPLOAD: 1, LOADING: 2, RESULTS: 3, ERROR: 5 }

function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [loadingStage, setLoadingStage] = useState('')
  const [extraction, setExtraction] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showMethodology, setShowMethodology] = useState(false)

  async function handleUpload(file) {
    setStep(STEPS.LOADING)
    setLoadingStage('Lecture du PDF…')
    try {
      const { fullText, numPages } = await extractPdfText(file)
      if (!fullText || fullText.length < 50) {
        setErrorMsg("Ce PDF semble être un scan. L'OCR n'est pas encore supporté.")
        setStep(STEPS.ERROR)
        return
      }

      setLoadingStage(`Analyse des ${numPages} page${numPages > 1 ? 's' : ''} via IA…`)
      const res = await fetch('/api/analyze-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const fallback = res.status === 503
          ? "Service d'analyse momentanément indisponible. Réessaie plus tard."
          : res.status === 429
            ? "Trop de requêtes. Réessaie dans une minute."
            : 'Analyse impossible. Réessaie dans quelques instants.'
        setErrorMsg(err.error || fallback)
        setStep(STEPS.ERROR)
        return
      }
      const raw = await res.json()

      setLoadingStage('Vérification des prix marché…')
      const enriched = enrichPiecesWithSurfaces(raw)
      setExtraction(enriched)
      setAnalysis(analyzeDevis(enriched, prixBTP))
      setStep(STEPS.RESULTS)
    } catch (err) {
      console.error(err)
      setErrorMsg('Erreur inattendue. Vérifie le fichier et réessaie.')
      setStep(STEPS.ERROR)
    }
  }

  function handleRecompute(updatedExtraction) {
    const enriched = enrichPiecesWithSurfaces(updatedExtraction)
    setExtraction(enriched)
    setAnalysis(analyzeDevis(enriched, prixBTP))
  }

  function handleReset() {
    setStep(STEPS.UPLOAD)
    setExtraction(null)
    setAnalysis(null)
    setErrorMsg('')
  }

  if (showMethodology) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="logo"><span className="logo-icon">€</span><span className="logo-text">DevisCheck</span></div>
        </header>
        <main className="app-main">
          <MethodologyPage onBack={() => setShowMethodology(false)} />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">€</span>
          <span className="logo-text">DevisCheck</span>
        </div>
        <p className="tagline">Upload ton devis, on signale les anomalies</p>
      </header>

      <main className="app-main">
        {step === STEPS.UPLOAD && <UploadZone onFile={handleUpload} />}

        {step === STEPS.LOADING && (
          <div className="loading">
            <div className="spinner" />
            <p>{loadingStage}</p>
          </div>
        )}

        {step === STEPS.RESULTS && analysis && (
          <AnalysisReport
            analysis={analysis}
            extraction={extraction}
            onRecompute={handleRecompute}
            onReset={handleReset}
          />
        )}

        {step === STEPS.ERROR && (
          <div className="error-box">
            <h2>Quelque chose s'est mal passé</h2>
            <p>{errorMsg}</p>
            <button className="btn primary" onClick={handleReset}>Réessayer</button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>DevisCheck — Analyse gratuite de devis BTP — <button className="link-btn" onClick={() => setShowMethodology(true)}>Méthodologie</button></p>
      </footer>
    </div>
  )
}

export default App
