import LegalLayout from './LegalLayout'

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales">
      <section>
        <h2>Éditeur du service</h2>
        <p><strong>DevisCheck</strong> est un service édité à titre personnel.</p>
        <p>Contact : <a href="mailto:contact@devischeck.fr">contact@devischeck.fr</a></p>
        <p>Hébergement : Vercel Inc., 340 Pine Street Suite 701, San Francisco, CA 94104, USA</p>
      </section>

      <section>
        <h2>Directeur de la publication</h2>
        <p>Le directeur de la publication est l'éditeur du service tel que désigné ci-dessus.</p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu de ce site (textes, images, bases de données de prix, algorithmes d'analyse)
          est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle,
          est interdite sans accord préalable écrit.
        </p>
      </section>

      <section>
        <h2>Limitation de responsabilité</h2>
        <p>
          DevisCheck fournit des analyses à titre informatif, basées sur des prix de marché représentatifs
          de la région Île-de-France. Ces analyses sont produites par un système d'intelligence artificielle
          et <strong>ne constituent pas un audit juridique, comptable ou technique</strong>.
        </p>
        <p>
          <strong>DevisCheck ne remplace pas l'avis d'un expert BTP qualifié, d'un huissier de justice
          ou d'un conseiller juridique.</strong> L'utilisateur reste seul responsable de ses décisions
          contractuelles et financières.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre{' '}
          <a href="/confidentialite">Politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>Droit applicable</h2>
        <p>Le présent site est soumis au droit français. Tout litige relève de la compétence des tribunaux français.</p>
      </section>

      <p className="legal-updated">Dernière mise à jour : mai 2026</p>
    </LegalLayout>
  )
}
