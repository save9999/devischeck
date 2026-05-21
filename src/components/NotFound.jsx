import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <header className="app-header" role="banner">
        <div className="app-header-inner">
          <Link to="/" className="logo logo-btn" aria-label="Retour à l'accueil DevisCheck">
            <span className="logo-icon" aria-hidden="true">€</span>
            <span className="logo-text">DevisCheck</span>
          </Link>
        </div>
      </header>

      <main className="not-found-content" id="main-content">
        <div className="not-found-inner">
          <div className="not-found-code" aria-hidden="true">404</div>
          <h1 className="not-found-title">Page introuvable</h1>
          <p className="not-found-text">
            La page que vous cherchez n'existe pas ou a été déplacée.
          </p>
          <Link to="/" className="btn-hero">
            Retour à l'accueil →
          </Link>
        </div>
      </main>
    </div>
  )
}
