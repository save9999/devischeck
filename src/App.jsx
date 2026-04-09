import { useState } from 'react'
import './App.css'
import UploadZone from './components/UploadZone'
import RoomList from './components/RoomList'
import AnalysisReport from './components/AnalysisReport'
import { calculateSurfaces } from './utils/surfaceCalculator'
import { analyzeDevis } from './utils/priceAnalyzer'

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
              setStep(STEPS.UPLOAD)
              setDevisLines([])
              setRooms([])
              setAnalysis(null)
            }}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>DevisCheck — Analyse gratuite de devis BTP — Prix marché IDF 2026</p>
      </footer>
    </div>
  )
}

export default App
