import { useState } from 'react'
import { Link } from 'react-router-dom'

const CHECKS = [
  { icon: '📊', label: 'Prix du marché IDF 2026', desc: 'Comparaison avec 200+ prestations BTP' },
  { icon: '🚨', label: 'Lignes suspectes détectées', desc: 'Postes gonflés, doublons, libellés vagues' },
  { icon: '📋', label: 'Mentions légales manquantes', desc: 'SIRET, assurance, garantie décennale' },
  { icon: '🛡️', label: 'Garantie décennale vérifiée', desc: 'Obligation légale pour tous les artisans' },
  { icon: '💼', label: 'Assurance professionnelle', desc: 'Responsabilité civile professionnelle' },
  { icon: '💰', label: 'Contre-devis au juste prix', desc: 'Ce que vous devriez vraiment payer' },
]

const STEPS = [
  { num: '01', icon: '📤', title: 'Uploadez votre devis PDF', desc: 'Glissez-déposez le devis reçu. Votre fichier reste confidentiel.' },
  { num: '02', icon: '🏠', title: 'Renseignez les dimensions', desc: 'Surface de la pièce en quelques secondes. Aide à détecter les quantités exagérées.' },
  { num: '03', icon: '📑', title: 'Recevez votre rapport', desc: 'Analyse complète, lignes annotées, économie possible calculée.' },
]

const CASES = [
  {
    tag: 'Salle de bain — Île-de-France',
    title: 'Carrelage facturé 3× le prix marché',
    amount: '+1 840 €',
    desc: `Le poste "fourniture carrelage grès cérame" était à 85 €/m² pour une prestation standard à 28 €/m². L'analyse l'a détecté en quelques secondes.`,
    verdict: 'bad',
  },
  {
    tag: 'Rénovation cuisine — Paris 15e',
    title: 'Garantie décennale non mentionnée',
    amount: 'Risque juridique',
    desc: `Absence totale de mention de garantie décennale et d'assurance pro. Travaux de plomberie encastrée : l'artisan aurait pu fuir toute responsabilité.`,
    verdict: 'warn',
  },
  {
    tag: 'Électricité — Boulogne',
    title: 'Devis correct, artisan fiable',
    amount: 'Validé ✓',
    desc: `Toutes les lignes dans les prix du marché, garanties présentes. L'utilisateur a signé en confiance — sans se demander s'il se faisait avoir.`,
    verdict: 'ok',
  },
]

const TESTIMONIALS = [
  {
    name: 'Sophie M.',
    location: 'Levallois-Perret',
    text: `J'avais un devis salle de bain à 14 000 €. L'analyse a montré une surfacturation de 3 200 €. J'ai renégocié et l'artisan a baissé sans rechigner.`,
    stars: 5,
  },
  {
    name: 'Pierre & Claire D.',
    location: 'Versailles',
    text: 'On ne savait pas du tout si notre devis cuisine était normal. En 2 minutes on avait la réponse. Ça nous a évité une longue et coûteuse erreur.',
    stars: 5,
  },
  {
    name: 'Hamid B.',
    location: 'Paris 11e',
    text: 'L\'artisan n\'avait pas mentionné sa garantie décennale. DevisCheck l\'a signalé — j\'aurais signé sans m\'en rendre compte.',
    stars: 5,
  },
]

const FAQ = [
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Votre devis est analysé puis immédiatement supprimé de nos serveurs. Aucun stockage, aucune transmission à des tiers. Conforme RGPD.',
  },
  {
    q: 'Quels types de devis peut-on analyser ?',
    a: 'Tous les devis BTP en Île-de-France : plomberie, carrelage, électricité, peinture, menuiserie, renovation complète. Le moteur couvre 200+ postes.',
  },
  {
    q: 'Est-ce que ça fonctionne si mon devis est un scan ?',
    a: 'Les PDFs natifs fonctionnent parfaitement. Les scans peuvent être moins précis selon la qualité du scan — un PDF généré par ordinateur donne toujours de meilleurs résultats.',
  },
  {
    q: 'Puis-je analyser un devis hors Île-de-France ?',
    a: 'La base de prix est calibrée sur l\'IDF 2026. Les résultats restent indicatifs pour d\'autres régions — les tendances de surfacturation sont souvent similaires.',
  },
  {
    q: 'La vérification est-elle garantie 100% exacte ?',
    a: 'L\'analyse compare à des prix marché représentatifs. Elle détecte les anomalies significatives. C\'est un outil d\'aide à la décision — pas un audit juridique.',
  },
]

export default function Landing({ onStart }) {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="landing">
      <a href="#main-content" className="skip-to-content">Aller au contenu principal</a>

      {/* Hero */}
      <section className="hero" id="main-content">
        <div className="hero-badge">Gratuit — Analyse en 60 secondes</div>
        <h1 className="hero-title">
          Votre devis BTP est-il<br />
          <span className="hero-accent">honnête ou gonflé ?</span>
        </h1>
        <p className="hero-sub">
          L'IA qui détecte les arnaques, surfacturations et mentions légales manquantes.
          Uploadez votre devis — recevez un rapport complet en moins d'une minute.
        </p>
        <button className="btn-hero" onClick={onStart} aria-label="Vérifier mon devis BTP maintenant">
          Vérifier mon devis maintenant →
        </button>
        <p className="hero-reassure">PDF uniquement · Vos données supprimées après analyse · RGPD</p>

        {/* Mock devis annoté */}
        <figure className="hero-mockup" aria-label="Exemple de devis analysé avec annotations de surfacturation">
          <div className="mockup-card">
            <div className="mockup-header">
              <span className="mockup-badge-label">DEVIS REÇU</span>
              <span className="mockup-filename">devis-renovation.pdf</span>
            </div>
            <div className="mockup-lines">
              <div className="mockup-line">
                <span className="mockup-desc">Fourniture carrelage grès cérame 60×60</span>
                <span className="mockup-price">2 380 €</span>
                <span className="mockup-tag tag-bad">+187% marché</span>
              </div>
              <div className="mockup-line">
                <span className="mockup-desc">Pose carrelage mural</span>
                <span className="mockup-price">940 €</span>
                <span className="mockup-tag tag-warn">+32% marché</span>
              </div>
              <div className="mockup-line">
                <span className="mockup-desc">Receveur de douche 90×90</span>
                <span className="mockup-price">380 €</span>
                <span className="mockup-tag tag-ok">Prix correct</span>
              </div>
              <div className="mockup-line">
                <span className="mockup-desc">Plomberie générale</span>
                <span className="mockup-price">1 200 €</span>
                <span className="mockup-tag tag-warn">+28% marché</span>
              </div>
            </div>
            <div className="mockup-verdict">
              <span>Économie possible estimée :</span>
              <strong className="mockup-savings">+1 840 €</strong>
            </div>
          </div>
        </figure>
      </section>

      {/* Comment ça marche */}
      <section className="section">
        <div className="section-label">Simple et rapide</div>
        <h2 className="section-title-h2">En 3 étapes, vous savez tout</h2>
        <div className="steps-grid">
          {STEPS.map(s => (
            <div key={s.num} className="step-card">
              <div className="step-num">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="steps-cta">
          <button className="btn-hero" onClick={onStart} aria-label="Analyser mon devis BTP">
            Analyser mon devis →
          </button>
        </div>
      </section>

      {/* Ce qu'on vérifie */}
      <section className="section section-alt">
        <div className="section-label">Ce que l'IA analyse</div>
        <h2 className="section-title-h2">6 points de contrôle systématiques</h2>
        <div className="checks-grid">
          {CHECKS.map((c, i) => (
            <div key={i} className="check-card">
              <span className="check-icon">{c.icon}</span>
              <div>
                <p className="check-label">{c.label}</p>
                <p className="check-desc">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cas concrets */}
      <section className="section">
        <div className="section-label">Cas réels détectés</div>
        <h2 className="section-title-h2">Ce que nos utilisateurs ont découvert</h2>
        <div className="cases-grid">
          {CASES.map((c, i) => (
            <div key={i} className={`case-card case-${c.verdict}`}>
              <div className="case-tag">{c.tag}</div>
              <h3 className="case-title">{c.title}</h3>
              <div className={`case-amount amount-${c.verdict}`}>{c.amount}</div>
              <p className="case-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Témoignages */}
      <section className="section section-alt">
        <div className="section-label">Ils ont vérifié leur devis</div>
        <h2 className="section-title-h2">Ce qu'ils en disent</h2>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial-card">
              <div className="testimonial-stars">{'★'.repeat(t.stars)}</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <span className="testimonial-name">{t.name}</span>
                <span className="testimonial-location">{t.location}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tarification */}
      <section className="section pricing-section">
        <div className="section-label">Tarification</div>
        <h2 className="section-title-h2">Arrêtez de signer sans savoir</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-name">Analyse unique</div>
            <div className="pricing-price">9,99 <span>€</span></div>
            <div className="pricing-period">Par devis analysé</div>
            <ul className="pricing-features">
              <li>✓ Analyse ligne par ligne complète</li>
              <li>✓ Rapport PDF téléchargeable</li>
              <li>✓ Mentions légales vérifiées</li>
              <li>✓ Contre-devis au juste prix</li>
            </ul>
            <button className="btn-pricing" onClick={onStart}>Commencer →</button>
          </div>
          <div className="pricing-card pricing-featured">
            <div className="pricing-badge">Le plus populaire</div>
            <div className="pricing-name">Illimité</div>
            <div className="pricing-price">14,99 <span>€/mois</span></div>
            <div className="pricing-period">+ 7 jours d'essai gratuit</div>
            <ul className="pricing-features">
              <li>✓ Devis illimités</li>
              <li>✓ Tous les avantages Unique</li>
              <li>✓ Historique des analyses</li>
              <li>✓ Comparaison multi-devis</li>
              <li>✓ Support prioritaire</li>
            </ul>
            <button className="btn-pricing btn-pricing-featured" onClick={onStart}>Essai gratuit 7j →</button>
          </div>
        </div>
        <p className="pricing-reassure">Résiliable à tout moment · Paiement sécurisé · Sans engagement</p>
      </section>

      {/* Sécurité RGPD */}
      <section className="section section-alt">
        <div className="security-block">
          <div className="security-icons">
            <span>🔒</span><span>🇪🇺</span><span>🗑️</span>
          </div>
          <h2 className="security-title">Vos données sont en sécurité</h2>
          <p className="security-text">
            Votre devis contient des informations sensibles. Nous le traitons et le supprimons immédiatement après analyse.
            Aucun stockage, aucune revente. Conforme au RGPD européen.
          </p>
          <div className="security-badges">
            <span className="sec-badge">Données supprimées après analyse</span>
            <span className="sec-badge">Chiffrement TLS</span>
            <span className="sec-badge">Conforme RGPD</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="section-label">FAQ</div>
        <h2 className="section-title-h2">Questions fréquentes</h2>
        <div className="faq-list" role="list">
          {FAQ.map((f, i) => (
            <div key={i} className="faq-item" role="listitem">
              <h3 className="faq-item-heading">
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-btn-${i}`}
                >
                  {f.q}
                  <span className={`faq-chevron ${openFaq === i ? 'open' : ''}`} aria-hidden="true">›</span>
                </button>
              </h3>
              <div
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-btn-${i}`}
                hidden={openFaq !== i}
              >
                <p className="faq-answer">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="cta-final">
        <h2 className="cta-title">Votre prochain devis mérite d'être vérifié.</h2>
        <p className="cta-sub">Les surfacturations dépassent souvent 20% du total. Ne signez plus sans savoir.</p>
        <button className="btn-hero" onClick={onStart} aria-label="Vérifier mon devis BTP">
          Vérifier mon devis →
        </button>
        <p className="cta-disclaimer">
          DevisCheck est un outil d'aide à la décision — il ne remplace pas un expert BTP, un huissier ou un conseiller juridique.
        </p>
      </section>

      {/* Footer */}
      <footer className="landing-footer" role="contentinfo">
        <div className="footer-logo" aria-label="Logo DevisCheck">
          <span className="footer-logo-icon" aria-hidden="true">€</span>
          <span className="footer-logo-text">DevisCheck</span>
        </div>
        <nav className="footer-links" aria-label="Liens légaux">
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/confidentialite">Politique de confidentialité</Link>
          <Link to="/cgu">CGU</Link>
          <Link to="/cgv">CGV</Link>
          <a href="mailto:contact@devischeck.fr">Contact</a>
        </nav>
        <p className="footer-disclaimer">
          Outil d'aide à la décision — DevisCheck ne remplace pas un expert BTP, un huissier ou un conseiller juridique.
        </p>
        <p className="footer-copy">© 2026 DevisCheck — Prix marché IDF 2026 · Tous droits réservés</p>
      </footer>

    </div>
  )
}
