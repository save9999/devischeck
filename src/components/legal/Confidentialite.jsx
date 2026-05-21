import LegalLayout from './LegalLayout'

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement est l'éditeur du service DevisCheck.
          Contact : <a href="mailto:contact@devischeck.fr">contact@devischeck.fr</a>
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>DevisCheck collecte uniquement les données strictement nécessaires :</p>
        <ul>
          <li>
            <strong>Devis soumis (PDF)</strong> : traité en mémoire lors de l'analyse,
            <strong> supprimé immédiatement après la fin de l'analyse</strong>. Aucun stockage persistant.
          </li>
          <li>
            <strong>Données de navigation</strong> : cookies techniques nécessaires au fonctionnement
            (pas de cookies publicitaires sans consentement).
          </li>
          <li>
            <strong>Données de compte</strong> (abonnés) : adresse e-mail, historique des analyses.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Traitement du devis soumis</h2>
        <p>
          Le fichier PDF déposé est analysé localement dans votre navigateur et/ou transmis
          temporairement à nos serveurs pour extraction de texte.{' '}
          <strong>Il est supprimé immédiatement après l'analyse.</strong> Aucune copie n'est
          conservée. Aucune transmission à des tiers.
        </p>
        <p>
          Cette procédure est conforme au Règlement Général sur la Protection des Données (RGPD —
          Règlement UE 2016/679).
        </p>
      </section>

      <section>
        <h2>4. Base légale</h2>
        <ul>
          <li>Exécution du contrat (analyse du devis)</li>
          <li>Intérêt légitime (amélioration du service, sécurité)</li>
          <li>Consentement (cookies non essentiels)</li>
        </ul>
      </section>

      <section>
        <h2>5. Durée de conservation</h2>
        <ul>
          <li>Devis PDF : <strong>suppression immédiate après analyse</strong></li>
          <li>Données de compte : conservées pendant la durée du contrat + 3 ans</li>
          <li>Logs techniques : 12 mois maximum</li>
        </ul>
      </section>

      <section>
        <h2>6. Vos droits (RGPD)</h2>
        <p>
          Conformément au RGPD, vous disposez des droits d'accès, rectification, effacement,
          portabilité et opposition. Pour exercer ces droits :
          <a href="mailto:contact@devischeck.fr"> contact@devischeck.fr</a>.
        </p>
        <p>
          Vous pouvez également adresser une réclamation à la CNIL :{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>
          DevisCheck utilise uniquement des cookies techniques essentiels au fonctionnement
          (mémorisation du consentement au bandeau cookie, session utilisateur).
          Aucun cookie publicitaire ou de tracking tiers n'est déposé sans votre consentement.
        </p>
      </section>

      <section>
        <h2>8. Transfert hors UE</h2>
        <p>
          L'hébergement est assuré par Vercel Inc. (USA). Les transferts sont encadrés par les
          clauses contractuelles types de la Commission européenne.
        </p>
      </section>

      <p className="legal-updated">Dernière mise à jour : mai 2026</p>
    </LegalLayout>
  )
}
