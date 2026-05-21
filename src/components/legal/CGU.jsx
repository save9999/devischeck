import LegalLayout from './LegalLayout'

export default function CGU() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes CGU régissent l'utilisation de la plateforme DevisCheck, service en ligne
          permettant l'analyse automatisée de devis BTP par intelligence artificielle.
        </p>
      </section>

      <section>
        <h2>2. Nature du service</h2>
        <p>
          DevisCheck est un <strong>outil d'aide à la décision</strong>. L'analyse est produite
          automatiquement par un système IA comparant les montants du devis soumis à une base de
          prix de marché IDF 2026.
        </p>
        <p>
          <strong>Avertissement important :</strong> DevisCheck ne remplace pas un expert en bâtiment,
          un huissier de justice, un avocat ou tout autre professionnel qualifié. Les résultats fournis
          sont indicatifs et ne constituent pas un conseil juridique, comptable ou technique.
        </p>
      </section>

      <section>
        <h2>3. Analyse IA — traitement du devis</h2>
        <p>
          En soumettant un devis, l'utilisateur accepte que son document soit traité automatiquement
          par nos algorithmes d'analyse. <strong>Le fichier soumis est supprimé immédiatement après
          la fin de l'analyse.</strong> Aucune copie n'est conservée sur nos serveurs.
        </p>
        <p>
          L'utilisateur certifie être le destinataire légitime du devis soumis et s'interdit de
          transmettre des documents confidentiels appartenant à des tiers sans leur accord.
        </p>
      </section>

      <section>
        <h2>4. Responsabilité</h2>
        <p>
          DevisCheck ne peut être tenu responsable des décisions prises par l'utilisateur sur la
          base des analyses fournies. L'utilisateur demeure seul responsable de ses actes juridiques
          et financiers, notamment de la signature ou du refus d'un devis.
        </p>
      </section>

      <section>
        <h2>5. Utilisation acceptable</h2>
        <p>Il est interdit d'utiliser DevisCheck pour :</p>
        <ul>
          <li>Analyser des documents appartenant à des tiers sans autorisation</li>
          <li>Contourner les mécanismes de paiement</li>
          <li>Attaquer l'infrastructure technique du service</li>
          <li>Extraire ou reproduire la base de données de prix</li>
        </ul>
      </section>

      <section>
        <h2>6. Modification des CGU</h2>
        <p>
          DevisCheck se réserve le droit de modifier les présentes CGU à tout moment.
          Les utilisateurs seront informés par notification sur le service.
        </p>
      </section>

      <section>
        <h2>7. Droit applicable</h2>
        <p>Les présentes CGU sont soumises au droit français.</p>
      </section>

      <p className="legal-updated">Dernière mise à jour : mai 2026</p>
    </LegalLayout>
  )
}
