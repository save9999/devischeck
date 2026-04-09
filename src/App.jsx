import { useState } from 'react'
import './App.css'

const STEPS = { UPLOAD: 1, DIMENSIONS: 2, RESULTS: 3 }

function App() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [devisLines, setDevisLines] = useState([])
  const [rooms, setRooms] = useState([])
  const [analysis, setAnalysis] = useState(null)

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">€</span>
          <span className="logo-text">DevisCheck</span>
        </div>
        <p className="tagline">Vérifiez votre devis en 3 étapes</p>
      </header>

      <div className="progress-bar">
        <div className={`progress-step ${step >= STEPS.UPLOAD ? 'active' : ''} ${step > STEPS.UPLOAD ? 'done' : ''}`}>
          <div className="step-circle">{step > STEPS.UPLOAD ? '✓' : '1'}</div>
          <span>Devis PDF</span>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${step >= STEPS.DIMENSIONS ? 'active' : ''} ${step > STEPS.DIMENSIONS ? 'done' : ''}`}>
          <div className="step-circle">{step > STEPS.DIMENSIONS ? '✓' : '2'}</div>
          <span>Dimensions</span>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${step >= STEPS.RESULTS ? 'active' : ''}`}>
          <div className="step-circle">3</div>
          <span>Analyse</span>
        </div>
      </div>

      <main className="app-main">
        {step === STEPS.UPLOAD && (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Étape 1 — Upload (à venir)</p>
        )}
        {step === STEPS.DIMENSIONS && (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Étape 2 — Dimensions (à venir)</p>
        )}
        {step === STEPS.RESULTS && (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Étape 3 — Résultats (à venir)</p>
        )}
      </main>

      <footer className="app-footer">
        <p>DevisCheck — Analyse gratuite de devis BTP — Prix marché IDF 2026</p>
      </footer>
    </div>
  )
}

export default App
