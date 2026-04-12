# DevisCheck — Système de crédits payant

**Date** : 2026-04-12
**Statut** : Validé
**Projet** : `/Users/superbot/devischeck` (SPA React 19 + Vite, déployé sur `devischeck.vercel.app`)
**Prérequis** : Refonte déployée (branche `devischeck-refonte`, en prod)

## Contexte

DevisCheck est un outil gratuit de vérification de devis BTP. Chaque analyse consomme ~0,005-0,01€ d'API Claude (Anthropic), payé par le propriétaire du projet. Pour rendre le projet viable financièrement, on ajoute un système de crédits payant : chaque utilisateur doit créer un compte et acheter des crédits avant de pouvoir analyser un devis.

## Modèle de monétisation

**Pay-per-use** : 1 analyse = 1 crédit. Pas de freemium, pas d'abonnement.

**Grille de prix** (ajustable dans Stripe à tout moment) :

| Pack | Prix TTC | Par analyse | Credits |
|---|---|---|---|
| Starter | 1,99€ | 1,99€ | 1 |
| Standard | 4,99€ | 1,00€ | 5 |
| Pro | 14,99€ | 0,75€ | 20 |

## Architecture

```
Utilisateur
    │
    ├── Login (Supabase Auth : magic link email / Google OAuth)
    │
    ├── Acheter crédits → api/create-checkout.js → Stripe Checkout
    │                      ← Webhook checkout.session.completed
    │                      → api/stripe-webhook.js → Supabase UPDATE credits
    │
    └── Upload PDF → api/analyze-devis.js
                        ├── 1. Vérifie JWT Supabase (header Authorization)
                        ├── 2. Vérifie solde credits ≥ 1
                        ├── 3. Débite 1 crédit (UPDATE atomique)
                        ├── 4. Appelle Claude
                        ├── 5. Insère dans analyses (audit trail)
                        └── 6. Retourne résultat
                        (Si Claude échoue après débit → recrédite auto)
```

## Base de données — Supabase PostgreSQL

### Table `profiles`

Liée à `auth.users` via trigger `on_auth_user_created`.

```sql
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  credits    INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Pas de UPDATE/INSERT/DELETE policy côté client
-- Seul le service_role (serveur) peut modifier les crédits
```

### Table `transactions`

Historique des achats de crédits.

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session  TEXT UNIQUE NOT NULL,
  credits_added   INTEGER NOT NULL,
  amount_cents    INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);
```

### Table `analyses`

Audit trail des analyses consommées.

```sql
CREATE TABLE analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  pages       INTEGER,
  lines_count INTEGER,
  verdict     TEXT
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id);
```

### Trigger auto-création profil

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, credits)
  VALUES (NEW.id, NEW.email, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## Authentification — Supabase Auth

**Méthodes activées** :
- Email magic link (pas de mot de passe)
- Google OAuth

**Composant UI** : `@supabase/auth-ui-react` avec le thème `ThemeSupa`.

**Flow** :
1. L'utilisateur arrive sur DevisCheck
2. S'il n'est pas connecté, l'app affiche `AuthGate` (login/signup) au lieu de l'upload zone
3. Après login, le JWT est stocké automatiquement par Supabase JS client
4. Le header affiche email + solde crédits + bouton déconnexion
5. Le trigger Supabase crée une ligne `profiles` avec 0 crédits à la première connexion

**Client Supabase** : `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Paiement — Stripe Checkout

### `api/create-checkout.js`

**Input** : `POST { packId: "starter" | "standard" | "pro" }` + header `Authorization: Bearer <jwt>`

**Flow** :
1. Vérifie le JWT Supabase → extrait `userId`
2. Crée une Stripe Checkout Session :
   - `mode: "payment"` (one-time)
   - `line_items` : 1 produit selon le pack
   - `metadata: { userId, credits, packId }`
   - `success_url: <origin>/credits?success=true`
   - `cancel_url: <origin>/credits`
3. Retourne `{ url: session.url }` → le frontend redirige

**Les produits Stripe sont créés dans le dashboard Stripe** (pas via code). Le mapping packId → priceId est en constante dans le code.

### `api/stripe-webhook.js`

**Input** : Webhook Stripe `checkout.session.completed`

**Flow** :
1. Vérifie la signature Stripe (`stripe.webhooks.constructEvent`)
2. Extrait `metadata.userId` et `metadata.credits` de la session
3. Vérifie que cette `session.id` n'a pas déjà été traitée (déduplification via `transactions.stripe_session UNIQUE`)
4. Dans une seule requête atomique :
   - INSERT dans `transactions`
   - UPDATE `profiles SET credits = credits + $credits WHERE id = $userId`
5. Retourne 200

**Sécurité critique** : ce endpoint n'accepte QUE les requêtes signées par Stripe. Pas de JWT Supabase ici — c'est Stripe qui appelle, pas l'utilisateur.

## Modification de `api/analyze-devis.js`

Le handler existant est modifié pour ajouter auth + crédit check :

```js
// Pseudo-code du flow modifié
import { createClient } from '@supabase/supabase-js'

// Client Supabase admin (service role) — créé une seule fois
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,   // même URL que le client
  process.env.SUPABASE_SERVICE_ROLE_KEY  // clé serveur uniquement
)

export default async function handler(req, res) {
  // 1. Auth check
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Non connecté' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Token invalide' })

  // 2. Débit atomique via RPC
  const { data: remaining, error: debitErr } = await supabaseAdmin
    .rpc('decrement_credit', { uid: user.id })

  if (debitErr || remaining === -1) {
    return res.status(402).json({ error: 'Crédits insuffisants', credits: 0 })
  }

  // 3. Appel Claude (existant)
  try {
    const result = await callClaudeWithRetry(userPrompt)
    const json = parseClaudeJson(result)

    // 4. Log analyse
    await supabaseAdmin.from('analyses').insert({
      user_id: user.id,
      pages: json.pieces?.length || 0,
      lines_count: json.lines?.length || 0,
      verdict: null, // sera calculé côté client
    })

    res.status(200).json({ ...json, creditsRemaining: remaining })
  } catch (err) {
    // 5. Recréditer si Claude échoue
    await supabaseAdmin.rpc('increment_credit', { uid: user.id })

    res.status(502).json({ error: 'Analyse impossible. Ton crédit a été restauré.' })
  }
}
```

### Fonction RPC Supabase `decrement_credit`

```sql
CREATE OR REPLACE FUNCTION decrement_credit(uid UUID)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits = credits - 1
  WHERE id = uid AND credits >= 1
  RETURNING credits INTO remaining;

  IF NOT FOUND THEN
    RETURN -1;  -- Signal: pas assez de crédits
  END IF;

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fonction RPC `increment_credit` (recréditer)

```sql
CREATE OR REPLACE FUNCTION increment_credit(uid UUID)
RETURNS INTEGER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  UPDATE profiles
  SET credits = credits + 1
  WHERE id = uid
  RETURNING credits INTO remaining;

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Composants UI

### `src/lib/supabase.js`

Client Supabase initialisé avec les clés Vite :
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### `src/components/AuthGate.jsx`

- Wraps l'app : si pas connecté → affiche le formulaire de login
- Utilise `@supabase/auth-ui-react` avec `ThemeSupa`
- Providers : `['google']` + magic link (email)
- Écoute `supabase.auth.onAuthStateChange` pour détecter la connexion

### `src/components/UserMenu.jsx`

- Affiché dans le header de l'app quand l'utilisateur est connecté
- Affiche : email (tronqué), solde crédits avec badge, bouton "Acheter des crédits", bouton déconnexion
- Le solde est rechargé depuis Supabase à chaque mount et après chaque analyse

### `src/components/CreditsPage.jsx`

- Affiche le solde actuel
- 3 cartes de packs (Starter / Standard / Pro) avec prix et nombre de crédits
- Clic → `fetch('/api/create-checkout', { packId })` → redirect vers `session.url`
- Paramètre `?success=true` dans l'URL après retour de Stripe → message de confirmation + rechargement du solde
- Historique des achats (table `transactions`) en bas de page

### `src/App.jsx` — modifications

- Ajout d'un `AuthProvider` (context React) qui gère :
  - `session` : la session Supabase courante
  - `profile` : les données `profiles` (dont `credits`)
  - `refreshProfile()` : recharge le profil depuis Supabase
- Ajout de `UserMenu` dans le header (remplace le tagline quand connecté)
- `UploadZone` vérifie `credits > 0` avant de permettre l'upload — si 0 crédits, affiche un CTA vers la page crédits
- Après une analyse réussie, `refreshProfile()` pour mettre à jour le solde dans le header

## Variables d'environnement

### Côté client (préfixe `VITE_`)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Côté serveur (Vercel Functions)

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
```

Toutes à configurer dans Vercel Dashboard → Environment Variables (Production + Preview).

## Fichiers — récapitulatif

### Nouveaux

- `src/lib/supabase.js` — client Supabase
- `src/components/AuthGate.jsx` — gate login/signup
- `src/components/UserMenu.jsx` — header user info + solde
- `src/components/CreditsPage.jsx` — page achat crédits
- `src/context/AuthContext.jsx` — React context auth + profile
- `api/create-checkout.js` — Vercel Function, crée Stripe Checkout Session
- `api/stripe-webhook.js` — Vercel Function, webhook Stripe → crédite compte
- `supabase/migrations/001_create_tables.sql` — schéma SQL complet

### Modifiés

- `api/analyze-devis.js` — ajout auth check + débit crédit + recréditage si échec
- `src/App.jsx` — AuthProvider wrapper, UserMenu dans header, route /credits
- `src/components/UploadZone.jsx` — vérif crédits avant upload
- `package.json` — ajout deps Supabase + Stripe
- `.env.local.example` — ajout variables Supabase + Stripe

## Sécurité

1. **Débit atomique SQL** : `UPDATE ... WHERE credits >= 1 RETURNING credits` — pas de race condition
2. **Webhook signé** : `stripe.webhooks.constructEvent` — impossible de forger un achat
3. **RLS** : les utilisateurs ne peuvent que lire leur propre profil/transactions/analyses — pas modifier
4. **Service role serveur uniquement** : `SUPABASE_SERVICE_ROLE_KEY` n'est JAMAIS exposé côté client
5. **Recréditage auto** : si Claude échoue après débit → crédit restauré
6. **Déduplification webhook** : `transactions.stripe_session UNIQUE` → un paiement ne peut créditer qu'une fois

## Hors scope

- Dashboard admin (stats revenus, liste utilisateurs)
- Remboursement Stripe automatique (via Stripe Dashboard manuellement)
- Facturation / TVA (Stripe Tax en itération future)
- API publique développeurs tiers
- Codes promo / parrainage
- Historique détaillé des analyses passées (résultats stockés)
- Notifications email (confirmations de paiement gérées par Stripe)
