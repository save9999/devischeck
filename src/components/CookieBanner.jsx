import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'devischeck_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  function refuse() {
    localStorage.setItem(STORAGE_KEY, 'refused')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Gestion des cookies"
      className="cookie-banner"
    >
      <p className="cookie-text">
        DevisCheck utilise uniquement des cookies techniques essentiels à son fonctionnement.
        Aucun cookie publicitaire.{' '}
        <Link to="/confidentialite" className="cookie-link">En savoir plus</Link>
      </p>
      <div className="cookie-actions">
        <button
          className="cookie-btn cookie-btn-refuse"
          onClick={refuse}
          aria-label="Refuser les cookies non essentiels"
        >
          Refuser
        </button>
        <button
          className="cookie-btn cookie-btn-accept"
          onClick={accept}
          aria-label="Accepter les cookies"
        >
          Accepter
        </button>
      </div>
    </div>
  )
}
