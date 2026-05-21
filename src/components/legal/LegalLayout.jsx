import { Link } from 'react-router-dom'

export default function LegalLayout({ title, children }) {
  return (
    <div className="legal-page">
      <header className="app-header" role="banner">
        <div className="app-header-inner">
          <Link to="/" className="logo logo-btn" aria-label="Retour à l'accueil DevisCheck">
            <span className="logo-icon" aria-hidden="true">€</span>
            <span className="logo-text">DevisCheck</span>
          </Link>
        </div>
      </header>

      <main className="legal-content" id="main-content">
        <div className="legal-container">
          <h1 className="legal-title">{title}</h1>
          {children}
          <div className="legal-disclaimer">
            <strong>Avertissement :</strong> DevisCheck est un outil d'aide à la décision basé sur l'IA.
            Il ne remplace pas l'avis d'un expert BTP, d'un huissier ou d'un conseiller juridique.
          </div>
        </div>
      </main>

      <footer className="app-footer" role="contentinfo">
        <nav aria-label="Liens légaux">
          <Link to="/mentions-legales">Mentions légales</Link>
          {' · '}
          <Link to="/cgu">CGU</Link>
          {' · '}
          <Link to="/cgv">CGV</Link>
          {' · '}
          <Link to="/confidentialite">Confidentialité</Link>
          {' · '}
          <Link to="/">Retour à l'accueil</Link>
        </nav>
      </footer>
    </div>
  )
}
