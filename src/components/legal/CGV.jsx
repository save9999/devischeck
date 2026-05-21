import LegalLayout from './LegalLayout'

export default function CGV() {
  return (
    <LegalLayout title="Conditions Générales de Vente">
      <section>
        <h2>1. Tarification</h2>
        <p>DevisCheck propose deux formules :</p>
        <ul>
          <li>
            <strong>Analyse unique — 9,99 €</strong> : une analyse complète d'un devis BTP,
            rapport PDF inclus, valable sans limitation de durée.
          </li>
          <li>
            <strong>Illimité — 14,99 €/mois</strong> : analyses illimitées, historique,
            comparaison multi-devis, support prioritaire.
            Inclut <strong>7 jours d'essai gratuit</strong> sans engagement.
          </li>
        </ul>
        <p>Tous les prix sont exprimés TTC en euros.</p>
      </section>

      <section>
        <h2>2. Paiement</h2>
        <p>
          Le paiement est effectué en ligne par carte bancaire via un prestataire de paiement
          sécurisé (Stripe). DevisCheck ne stocke aucune donnée de carte bancaire.
        </p>
      </section>

      <section>
        <h2>3. Rétractation</h2>
        <p>
          Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation
          ne s'applique pas aux prestations de services numériques pleinement exécutées avant la
          fin du délai de rétractation lorsque l'exécution a commencé avec l'accord préalable
          exprès du consommateur.
        </p>
        <p>
          Pour l'abonnement mensuel, l'utilisateur peut résilier à tout moment depuis son espace
          personnel. La résiliation prend effet à la fin de la période mensuelle en cours.
        </p>
      </section>

      <section>
        <h2>4. Remboursement</h2>
        <p>
          En cas d'erreur technique avérée empêchant la délivrance du service, un remboursement
          intégral sera effectué sous 14 jours ouvrés sur le moyen de paiement utilisé.
        </p>
      </section>

      <section>
        <h2>5. Limitation de responsabilité</h2>
        <p>
          <strong>DevisCheck ne remplace pas un expert BTP, un huissier ou un conseiller juridique.</strong>
          {' '}Le service est fourni à titre d'aide à la décision. DevisCheck ne garantit pas
          l'exactitude absolue de l'analyse vis-à-vis de chaque situation particulière.
        </p>
      </section>

      <section>
        <h2>6. Droit applicable — Médiation</h2>
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige non résolu,
          l'utilisateur peut recourir au médiateur de la consommation ou aux plateformes
          européennes de règlement en ligne des litiges.
        </p>
      </section>

      <p className="legal-updated">Dernière mise à jour : mai 2026</p>
    </LegalLayout>
  )
}
