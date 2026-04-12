import prixBTP from '../data/prixBTP.json'

export default function MethodologyPage({ onBack }) {
  return (
    <div className="methodology">
      <button className="btn" onClick={onBack}>← Retour</button>
      <h2>Méthodologie et sources</h2>

      <h3>D'où viennent les prix affichés ?</h3>
      <p>
        Les prix marché utilisés comme référence proviennent d'une base de données
        interne générée via IA (Claude) à partir de connaissances publiques sur les
        prix BTP France 2025-2026. Les fourchettes sont ensuite relues et validées
        manuellement, poste par poste.
      </p>

      <h3>Pourquoi des fourchettes et pas un prix unique ?</h3>
      <p>
        Même les bases professionnelles payantes (Batiprix, ArtiPrix) affichent
        des marges de ±10 à 15%. Le prix "vrai" dépend de variables qu'aucune base
        ne peut capturer : état du support existant, accessibilité du chantier,
        saisonnalité, relation artisan-client, choix exact des matériaux. Un outil
        qui prétendrait donner "le vrai prix" serait malhonnête.
      </p>

      <h3>Comment DevisCheck utilise ces prix ?</h3>
      <ul>
        <li>Chaque ligne est rattachée à un poste précis de la base</li>
        <li>Selon la prestation (fourniture+pose / pose seule / fourniture seule), seul le coût concerné est comparé</li>
        <li>Un coefficient régional est appliqué selon le code postal du chantier</li>
        <li>L'écart avec la fourchette marché est calculé et classé en catégories : conforme, à surveiller, anomalie</li>
      </ul>

      <h3>Limites connues</h3>
      <ul>
        <li>Les PDF scannés (images) ne sont pas encore supportés</li>
        <li>L'analyse dépend de la qualité de détection automatique des pièces</li>
        <li>Les devis de secteurs spécialisés (ERP, tertiaire) ne sont pas couverts</li>
      </ul>

      <h3>Informations techniques</h3>
      <p>
        Version de la base : <code>{prixBTP.metadata.version}</code><br />
        Dernière mise à jour : <code>{prixBTP.metadata.date_maj}</code><br />
        Région de référence : <code>{prixBTP.metadata.region_base}</code><br />
        Source : <code>{prixBTP.metadata.source}</code>
      </p>

      <h3>Avertissement légal</h3>
      <p className="legal">
        DevisCheck ne certifie pas le prix d'un devis. Il signale des écarts avec
        des fourchettes marché indicatives pour t'aider à poser les bonnes questions
        à ton artisan. L'outil ne remplace pas le conseil d'un professionnel.
      </p>
    </div>
  )
}
