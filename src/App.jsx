import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Landing from './components/Landing'
import UploadZone from './components/UploadZone'
import RoomList from './components/RoomList'
import AnalysisReport from './components/AnalysisReport'
import MentionsLegales from './components/legal/MentionsLegales'
import CGU from './components/legal/CGU'
import CGV from './components/legal/CGV'
import Confidentialite from './components/legal/Confidentialite'
import NotFound from './components/NotFound'
import CookieBanner from './components/CookieBanner'
import { calculateSurfaces } from './utils/surfaceCalculator'
import { analyzeDevis } from './utils/priceAnalyzer'

const STEPS = { LANDING: 0, UPLOAD: 1, DIMENSIONS: 2, RESULTS: 3 }

function AppWorkflow() {
  const [step, setStep] = useState(STEPS.LANDING)
  const [devisLines, setDevisLines] = useState([])
  const [rooms, setRooms] = useState([])
  const [analysis, setAnalysis] = useState(null)

  if (step === STEPS.LANDING) {
    return <Landing onStart={() => setStep(STEPS.UPLOAD)} />
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-to-content">Aller au contenu principal</a>
      <header className="app-header" role="banner">
        <div className="app-header-inner">
          <button
            className="logo logo-btn"
            onClick={() => setStep(STEPS.LANDING)}
            aria-label="Retour à l'accueil DevisCheck"
          >
            <span className="logo-icon" aria-hidden="true">€</span>
            <span className="logo-text">DevisCheck</span>
          </button>
          <p className="tagline">Vérifiez votre devis en 3 étapes</p>
        </div>
      </header>

      <nav aria-label="Étapes de l'analyse">
        <div className="progress-bar" role="list">
          <div
            className={`progress-step ${step >= STEPS.UPLOAD ? 'active' : ''} ${step > STEPS.UPLOAD ? 'done' : ''}`}
            role="listitem"
            aria-current={step === STEPS.UPLOAD ? 'step' : undefined}
          >
            <div className="step-circle" aria-hidden="true">{step > STEPS.UPLOAD ? '✓' : '1'}</div>
            <span>Devis PDF</span>
          </div>
          <div className="progress-line" aria-hidden="true" />
          <div
            className={`progress-step ${step >= STEPS.DIMENSIONS ? 'active' : ''} ${step > STEPS.DIMENSIONS ? 'done' : ''}`}
            role="listitem"
            aria-current={step === STEPS.DIMENSIONS ? 'step' : undefined}
          >
            <div className="step-circle" aria-hidden="true">{step > STEPS.DIMENSIONS ? '✓' : '2'}</div>
            <span>Dimensions</span>
          </div>
          <div className="progress-line" aria-hidden="true" />
          <div
            className={`progress-step ${step >= STEPS.RESULTS ? 'active' : ''}`}
            role="listitem"
            aria-current={step === STEPS.RESULTS ? 'step' : undefined}
          >
            <div className="step-circle" aria-hidden="true">3</div>
            <span>Analyse</span>
          </div>
        </div>
      </nav>

      <main className="app-main" id="main-content">
        {step === STEPS.UPLOAD && (
          <UploadZone onDevisLoaded={(result) => {
            setDevisLines(result.lines)
            setRooms([{
              id: Date.now(),
              type: 'salle_de_bain',
              longueur: '',
              largeur: '',
              hauteur: '',
              douche: { largeur: '', profondeur: '' },
              porte: { largeur: '0.8', hauteur: '2' },
              fenetre: null
            }])
            setStep(STEPS.DIMENSIONS)
          }} />
        )}
        {step === STEPS.DIMENSIONS && (
          <RoomList
            rooms={rooms}
            onChange={setRooms}
            devisLines={devisLines}
            onAnalyze={() => {
              const room = rooms[0]
              const surfaces = calculateSurfaces({
                ...room,
                longueur: parseFloat(room.longueur),
                largeur: parseFloat(room.largeur),
                hauteur: parseFloat(room.hauteur),
                douche: room.douche?.largeur && room.douche?.profondeur
                  ? { largeur: parseFloat(room.douche.largeur), profondeur: parseFloat(room.douche.profondeur) }
                  : null,
                porte: room.porte?.largeur
                  ? { largeur: parseFloat(room.porte.largeur), hauteur: parseFloat(room.porte.hauteur) }
                  : null,
                fenetre: null
              })
              const result = analyzeDevis(devisLines, surfaces)
              setAnalysis(result)
              setStep(STEPS.RESULTS)
            }}
          />
        )}
        {step === STEPS.RESULTS && analysis && (
          <AnalysisReport
            analysis={analysis}
            onReset={() => {
              setStep(STEPS.LANDING)
              setDevisLines([])
              setRooms([])
              setAnalysis(null)
            }}
          />
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        <p>
          DevisCheck — Analyse de devis BTP — Prix marché IDF 2026 —{' '}
          <a href="/mentions-legales" style={{color:'inherit'}}>Mentions légales</a>
          {' · '}
          <a href="/confidentialite" style={{color:'inherit'}}>Confidentialité</a>
        </p>
      </footer>

      <CookieBanner />
    </div>
  )
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AppWorkflow />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgu" element={<CGU />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
