/**
 * System Design — Level 8: Security, Privacy & Multi-tenancy.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l8-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L8. 16 lessons across 5
 * modules (sd-l8-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const authCredentialsTeach = `
## Authentication proves identity; the test is the morning after a dump

Authentication answers one question: who is this request from? Keep it strictly separate from authorization (what may they do), because conflating them is how systems end up trusting a valid-but-under-privileged token to do admin work. This lesson is about proving identity and, critically, about what your storage looks like the morning after an attacker copies your entire user table.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An attacker copies your entire 100M-row user table, backups included. Which way of storing passwords leaves them with nothing usable?",
  "options": [
    {
      "label": "Encrypt each password with AES under a strong key",
      "feedback": "Tempting because encryption sounds like the serious option, but encryption is reversible by design and the key usually lives near the data. You never need to read a password back, so reversibility is pure downside."
    },
    {
      "label": "Hash each password with SHA-256, since hashes cannot be reversed",
      "feedback": "Tempting because SHA-256 really is one-way, but it is built for speed: GPUs test hundreds of billions of SHA-256 guesses per second, so the dumped table is crackable offline in days."
    },
    {
      "label": "Hash with a slow, memory-hard KDF like argon2id plus a unique per-user salt",
      "correct": true,
      "feedback": "Right. A KDF tuned to cost 50 to 100 ms per guess makes offline cracking economically hopeless, and per-user salts kill precomputed tables. Add a pepper held in a KMS and the dump alone can never be cracked."
    }
  ]
}
\`\`\`

## Store a verifier you cannot reverse

The core rule: never store a password, store a verifier you cannot reverse. Use a memory-hard key derivation function: argon2id (preferred today), scrypt, or bcrypt. These are slow and memory-heavy on purpose so an attacker with your hashes cannot brute force billions of guesses per second on a GPU. A fast hash like MD5 or SHA-256 is the classic disqualifying answer: SHA-256 is designed to be fast, so a leaked SHA-256 table of 100M users is cracked at hundreds of billions of guesses per second. Tune argon2id to something like 19 MiB memory, 2 iterations, parallelism 1, then raise it until a single verify costs roughly 50 to 100 ms on your hardware. That latency is invisible per login but murders offline cracking.

Every password gets a unique random per-user salt, stored alongside the hash. Salt defeats precomputed rainbow tables and means two users with the same password get different hashes. A pepper is an optional secret added to every hash that lives outside the database (in a KMS or app config), so a database-only dump still lacks the pepper needed to crack anything. Salt is per-user and public; pepper is global and secret.

**Interview nuance:** "Survives a database dump" is the phrase to earn. It means: memory-hard KDF, per-user salt, and ideally a pepper held in a KMS the DB backup does not contain. If your answer is "we encrypt the passwords," that is wrong, passwords are hashed not encrypted, because you never need to reverse them.

## MFA and the recovery attack surface

MFA adds a second factor so a leaked password alone is not enough. Ranked by strength: hardware security keys and passkeys (phishing-resistant) > TOTP authenticator apps (RFC 6238, 30-second codes) > push approvals (watch for MFA-fatigue bombing) > SMS one-time codes. SMS is the weak one: SIM-swap attacks let an attacker port the victim's number and receive the code. Offer TOTP or keys as the default and treat SMS as a last resort. Use risk-based step-up: do not prompt MFA on a known device from a known location, do prompt on a new device, a new country, or a sensitive action like changing the recovery email.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort these second factors: which ones survive a determined phishing attempt, and which can still be captured or coerced out of the user?",
  "buckets": [
    "Phishing-resistant",
    "Still stealable"
  ],
  "items": [
    {
      "label": "Hardware security key",
      "bucket": "Phishing-resistant",
      "feedback": "The credential is origin-bound cryptography; there is no code for a fake site to capture."
    },
    {
      "label": "Passkey",
      "bucket": "Phishing-resistant",
      "feedback": "Same public-key model as a hardware key: nothing readable crosses the wire, so there is nothing to relay to a fake site."
    },
    {
      "label": "TOTP authenticator app code",
      "bucket": "Still stealable",
      "feedback": "Tempting to rank it with keys because there is no SMS to intercept, but it is still a number the user can type into a fake site, and a real-time proxy relays it within the 30-second window."
    },
    {
      "label": "SMS one-time code",
      "bucket": "Still stealable",
      "feedback": "Weakest of all: SIM-swap lets an attacker receive it directly, and it is phishable like any typed code."
    },
    {
      "label": "Push approval tap",
      "bucket": "Still stealable",
      "feedback": "MFA-fatigue bombing works precisely because a tired user can be pushed into tapping approve; nothing binds the tap to the real login attempt."
    }
  ]
}
\`\`\`

The uncomfortable truth: account recovery is the real attack surface. Attackers rarely crack a good hash; they take over the reset flow. A "forgot password" email link, an SMS code, or a support agent who can be socially engineered is often weaker than the login itself. Recovery must be as strong as the primary factor: signed single-use tokens with short expiry, rate limits, and re-verification of a second factor before letting anyone change the password or MFA settings.

## Stop credential stuffing without leaking who exists

Defend against credential stuffing (attackers replaying passwords leaked from other sites) without leaking who exists. Check new passwords against known-breached lists using the Have I Been Pwned k-anonymity API (send a 5-char hash prefix, never the password). Throttle and add exponential backoff per account and per IP, add CAPTCHA on suspicious volume, and return the exact same generic error and timing for "wrong password" and "no such user." Any difference in message, status code, or response time is a user-enumeration oracle. Use a constant-time comparison for tokens and codes so timing does not leak how many characters matched.

**Recap:** hash passwords with a memory-hard KDF plus per-user salt (and a KMS pepper) so a DB dump is useless, layer MFA with SMS as the weak factor, harden account recovery because it is the real attack surface, and stop credential stuffing with breach checks and throttling while never revealing whether an account exists.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are about to design the login service. A login request arrives for an email that has no account. What should the response be?",
  "options": [
    {
      "label": "A clear 'no account with that email' message, because it is better UX",
      "feedback": "Tempting because it genuinely helps confused users, but it hands attackers an oracle for which emails have accounts, feeding credential-stuffing lists and targeted phishing."
    },
    {
      "label": "A 404 for missing accounts and a 401 for wrong passwords",
      "feedback": "Tempting because distinct status codes feel like clean API design, but different codes are the loudest enumeration oracle of all; a script does not even need to parse the body."
    },
    {
      "label": "The exact same generic error, status code, and near-identical timing as a wrong password",
      "correct": true,
      "feedback": "Right. Any observable difference in message, code, or timing tells an attacker whether the account exists. Pair this with per-account and per-IP throttling and breached-password checks."
    }
  ],
  "reveal": "In your design write, cover the full survivability stack the recap names: argon2id with per-user salt and a KMS pepper so the dump is dead, phishing-resistant MFA with SMS demoted to last resort, recovery flows as strong as the login itself, and enumeration-safe errors with throttling and breach checks."
}
\`\`\`
`.trim()

const passkeysWebauthnTeach = `
## Passkeys replace shared secrets with a device-held private key

Passkeys are the industry's shift away from shared secrets. A password is a secret both you and the server know, which means the server can leak it and a phishing site can capture it. A passkey is a public-key credential: your device generates a key pair, keeps the private key, and hands the server only the public key. That single change eliminates two of the biggest classes of attack.

## How it works

During registration (WebAuthn \`navigator.credentials.create\`), the authenticator (your phone's secure enclave, a laptop's TPM, or a hardware key like a YubiKey) generates a key pair scoped to the site's origin. The server stores the public key and a credential ID against the user account. During login (\`navigator.credentials.get\`), the server sends a random challenge; the authenticator signs it with the private key after a local user gesture (Face ID, fingerprint, PIN), and the server verifies the signature against the stored public key. The private key never leaves the device and is never transmitted.

**Interview nuance:** "Breach-proof on the server" is the phrase that lands. A stolen user table full of public keys is worthless to an attacker, because a public key cannot be used to authenticate, only to verify. Compare that to a password hash dump, which is crackable offline. There is simply nothing secret to steal on the server side.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An attacker runs a perfect real-time phishing proxy: the victim interacts with a fake login page and every message is relayed instantly to the real site. This reliably defeats TOTP codes. Does it defeat a passkey?",
  "options": [
    {
      "label": "Yes. If the proxy relays everything, it can relay the passkey exchange too",
      "feedback": "Tempting because instant relay beats every code-based factor, but the browser will not even offer the credential on the wrong origin, so there is nothing for the proxy to relay."
    },
    {
      "label": "Yes, as long as the victim approves with Face ID on the fake page",
      "feedback": "Tempting because the user gesture happens locally either way, but the gesture only unlocks a credential the browser is willing to use, and the browser refuses to use the real site's credential on any other origin."
    },
    {
      "label": "No. The credential is bound to the exact origin, and the browser refuses to use it anywhere else",
      "correct": true,
      "feedback": "Right. Origin binding means the fake domain never sees a signature at all, and any signature is over a challenge tied to a specific origin, so it cannot be replayed. This is what phishing-resistant actually means."
    }
  ]
}
\`\`\`

## Phishing resistance from origin binding

The credential is cryptographically tied to the exact origin (say \`accounts.google.com\`). The browser will only offer and use that credential for that origin. If a victim lands on \`accounts-google.evil.com\`, the browser refuses to produce the credential, so there is nothing to phish. Contrast this with a TOTP code or an SMS OTP: those are just numbers the user reads and can be tricked into typing into a fake site, and a real-time phishing proxy relays them to the real site within the 30-second window. Passkeys close that hole because the signed challenge is bound to the origin and cannot be replayed elsewhere.

\`\`\`
Registration:  device generates keypair (scoped to origin)
               server stores  PUBLIC key + credential_id
Login:         server --challenge--> device
               device signs with PRIVATE key (after Face ID/PIN)
               device --signature--> server verifies vs public key
   private key NEVER leaves the device; nothing phishable on the wire
\`\`\`

## Authenticator types, sync, and attestation

Platform authenticators are built into the device (Touch ID, Windows Hello). Roaming authenticators are removable (USB/NFC security keys) and work across machines. Modern passkeys are usually synced: Apple's iCloud Keychain and Google Password Manager back the private key up to the cloud (end-to-end encrypted) and sync it across your devices, so losing one phone does not lose the passkey. Device-bound passkeys (typically on hardware keys) never leave that device, which is more secure but has no built-in recovery. For consumer products, synced passkeys win on usability; for high-assurance enterprise, device-bound keys plus attestation are common. Attestation is an optional signed statement about what kind of authenticator was used, letting an enterprise require, say, only certified hardware keys. Most consumer sites skip attestation to avoid a privacy and friction cost.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Synced or device-bound? Match each property to the passkey flavor it belongs to.",
  "buckets": [
    "Synced passkey",
    "Device-bound passkey"
  ],
  "items": [
    {
      "label": "Losing your phone does not lose the credential",
      "bucket": "Synced passkey",
      "feedback": "iCloud Keychain or Google Password Manager backs the private key up end-to-end encrypted and restores it on a new device."
    },
    {
      "label": "The private key can never exist anywhere but one authenticator",
      "bucket": "Device-bound passkey",
      "feedback": "Typical of hardware keys: stronger assurance, but no built-in recovery if the key is lost, so users must enroll a backup."
    },
    {
      "label": "The right default for a consumer product",
      "bucket": "Synced passkey",
      "feedback": "Consumers lose and replace devices constantly, so recovery through sync wins on usability."
    },
    {
      "label": "Pairs with attestation when an enterprise requires certified hardware",
      "bucket": "Device-bound passkey",
      "feedback": "Attestation proves what kind of authenticator produced the credential, which matters exactly when policy demands certified device-bound hardware."
    }
  ]
}
\`\`\`

## Device loss and coexistence

If a passkey is device-bound and the device is gone, the user is locked out unless they enrolled a second authenticator. Practical designs require enrolling at least two passkeys (phone plus a backup key), or fall back to another enrolled factor. Rolling out passkeys onto an existing password base uses progressive enrollment: keep passwords working, prompt users to add a passkey after a successful login, and over time let passkey-only users disable their password. Do not force a hard cutover; you will lock out the users whose only device just broke.

**Recap:** passkeys replace shared secrets with a device-held private key so the server stores only a useless-to-steal public key, origin binding makes them phishing-resistant where OTP and SMS are not, synced passkeys solve device loss for consumers while device-bound plus attestation suits enterprise, and you roll them out via progressive enrollment alongside passwords.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are adding passkeys to a site with 20M existing password users. Which rollout do you write down?",
  "options": [
    {
      "label": "Hard cutover: passwords stop working the day passkeys launch",
      "feedback": "Tempting because the password is the weak link you want dead, but a hard cutover locks out every user whose only device just broke or who never enrolled; device loss needs a second enrolled authenticator or a fallback factor first."
    },
    {
      "label": "Progressive enrollment: prompt users to add a passkey after a successful login, keep passwords working, and let passkey-only users disable their password later",
      "correct": true,
      "feedback": "Right. Enrollment rides on an already-authenticated session, nobody gets stranded, and the phishable credential is retired account by account instead of all at once."
    },
    {
      "label": "Keep the password as the primary credential and use the passkey only as a second factor forever",
      "feedback": "Tempting because layering feels safest, but it keeps a phishable shared secret as the anchor credential forever; the point of passkeys is to replace the password, not decorate it."
    }
  ],
  "reveal": "In the design write, name the moving parts: public-key credentials so the server holds nothing stealable, origin binding for phishing resistance, synced passkeys plus a required second authenticator for device loss, and progressive enrollment as the migration path off passwords."
}
\`\`\`
`.trim()

const oauthOidcTeach = `
## OAuth authorizes, OIDC authenticates

OAuth and OIDC are the most commonly muddled pair in interviews, so nail the distinction first. OAuth 2.0/2.1 is an authorization framework: it lets a user grant an application limited access to their resources on another service without sharing a password. The output is an access token that says "this app may call these APIs on this user's behalf." OpenID Connect (OIDC) is a thin authentication layer built on top of OAuth: it adds an ID token (a signed JWT) that proves who the user is. Shorthand: OAuth is "may this app do X," OIDC is "who is this user." "Sign in with Google" is OIDC; "let this app read your Google Drive" is OAuth.

The four roles: the resource owner (the user), the client (the app requesting access), the authorization server or AS (issues tokens, e.g. Google's identity service), and the resource server or RS (the API that accepts the token). Keep these straight and the flows make sense.

**Interview nuance:** saying "we use OAuth to log users in" is imprecise and interviewers notice. OAuth alone authorizes; you log users in with OIDC's ID token. And never say "we use OAuth" without naming a grant, that is the tell of someone who has not implemented it.

## OAuth 2.1 removed the footguns

- Authorization Code flow with PKCE is now required for all clients, including confidential ones. PKCE (Proof Key for Code Exchange) has the client send a hashed random \`code_verifier\` up front and reveal it at token exchange, so an intercepted authorization code is useless to an attacker who lacks the verifier.
- The Implicit grant (tokens returned directly in the URL fragment) is removed. It leaked tokens in browser history and referrers.
- The Resource Owner Password Credentials grant (app collects the user's password) is removed. It defeats the entire point of delegation.
- Exact redirect-URI string matching is required, closing open-redirect and token-theft holes.

## Grant selection, the thing you must get right

- Web apps, single-page apps, and mobile/native apps: Authorization Code + PKCE. SPAs and mobile are public clients (they cannot hold a secret), so PKCE is what protects them.
- Machine-to-machine (a backend service calling an API with no user present): Client Credentials grant. The service authenticates with its own client ID and secret (or mTLS) and gets a token representing itself.
- Input-constrained devices (smart TVs, CLIs, IoT): Device Authorization grant. The device shows a code and URL, the user approves on their phone, and the device polls for the token.

\`\`\`
Authorization Code + PKCE (SPA/mobile/web):
  client --(auth request + code_challenge)--> AS
  user authenticates & consents at AS
  AS --(authorization code)--> client (via exact redirect_uri)
  client --(code + code_verifier + [secret])--> AS token endpoint
  AS --> access_token (+ id_token for OIDC, + refresh_token)
\`\`\`

## Hardening tokens

Security parameters: \`scope\` limits what the token can do (least privilege: request \`read:contacts\`, not \`full_access\`). \`audience\` names which RS the token is for, so a token minted for API A cannot be replayed at API B. Consent screens make the grant explicit to the user. \`state\` protects the redirect against CSRF, and OIDC's \`nonce\` plus PKCE protect against replay and the confused-deputy problem.

Bearer vs sender-constrained tokens. A bearer token is like cash: whoever holds it can use it, so a leaked bearer token is fully usable. Sender-constrained tokens bind the token to a client key so a thief cannot use it: DPoP (a per-request proof signed by a key the client holds) or mTLS-bound tokens (bound to the client's TLS certificate). High-value APIs should prefer sender-constrained tokens.

Enterprise SSO: SAML is the older XML-based standard still dominant in enterprise; OIDC is the modern JSON/JWT equivalent and is preferred for new integrations. Pair either with SCIM for automated user provisioning and deprovisioning so that when HR offboards someone, access is revoked everywhere.

**Recap:** OAuth authorizes and OIDC (ID token) authenticates, OAuth 2.1 makes Authorization Code + PKCE mandatory and deletes implicit and password grants, you pick auth-code+PKCE for user apps, client-credentials for M2M, and device flow for TVs/CLIs, and you harden tokens with scopes, audience, state/nonce, and optionally DPoP/mTLS.
`.trim()

const sessionsTokensTeach = `
## Sessions trade scale against revocation

Once a user has authenticated, you need to remember them across requests without re-checking their password every time. That remembered state is a session, and the whole design question is a tradeoff between scale and revocation: how cheaply can you check a session, versus how fast can you kill one when a token leaks.

Two ends of the spectrum. A stateful (opaque) session is a random ID stored server-side (in Redis or a database) and handed to the client in a cookie. Every request looks it up. Revocation is trivial: delete the row and the session is dead instantly. The cost is a lookup per request and shared session storage, though Redis makes that a sub-millisecond hop. A stateless JWT carries the claims (user ID, roles, expiry) signed by the server, so any service can verify it with the public key and no lookup. That scales beautifully across many services, but it has a fatal weakness: you cannot un-issue it. A JWT is valid until it expires, so a stolen JWT with a 1-hour TTL is usable for up to an hour no matter what you do.

## The hybrid: short JWT + revocable refresh token

The standard resolution is a hybrid: a short-lived access token (JWT, 5 to 15 minutes) plus a long-lived refresh token (opaque, stored server-side). Services validate the JWT statelessly for speed; the short TTL bounds the blast radius of a leak; and the refresh token, which is stateful, gives you a revocation and rotation point. When the access token expires, the client exchanges the refresh token for a new one.

Refresh-token rotation with reuse detection is the key mechanism. Each time a refresh token is used, the server issues a new refresh token and invalidates the old one. The tokens form a "family" descended from the original login. If an old, already-used refresh token is ever presented again, that means someone has a copy they should not, so the server invalidates the entire family, forcing re-authentication. This detects token theft: the attacker and the legitimate user cannot both keep rotating; the second use of a spent token trips the alarm.

\`\`\`
login -> RT1
use RT1 -> AT + RT2   (RT1 now invalid)
use RT2 -> AT + RT3   (RT2 now invalid)
attacker replays stolen RT2  -> reuse detected -> kill whole family
\`\`\`

**Interview nuance:** "JWTs everywhere with no revocation story" is the classic wrong turn. If the interviewer asks "a token just leaked, how do you kill it right now," pure long-lived JWTs have no good answer. The strong answer is short access-token TTL plus a stateful refresh token you can revoke, or a denylist keyed by token ID checked at the edge.

## Where tokens live

Store session/refresh tokens in HttpOnly, Secure, SameSite cookies. HttpOnly means JavaScript cannot read the cookie, so an XSS bug cannot exfiltrate it. Secure means HTTPS-only. SameSite (Lax or Strict) blocks the cookie from being sent on cross-site requests, which mitigates CSRF; for state-changing requests also use an anti-CSRF token or the double-submit pattern. Never store tokens in localStorage: it is readable by any script on the page, so one XSS turns into full account takeover. The Backend-for-Frontend (BFF) pattern takes this further: the browser only ever holds a session cookie, and the server-side BFF holds the real OAuth tokens and attaches them to API calls, keeping tokens entirely out of the browser.

JWT validation hygiene: verify the signature and pin the algorithm, explicitly rejecting \`alg: none\` and preventing algorithm confusion (an attacker swapping RS256 for HS256 to sign with the public key). Check \`aud\` (this token is for me), \`iss\`, and \`exp\`. Rotate signing keys and publish them via JWKS so verifiers pick up new keys without a deploy. For logout and revocation, either rely on the short TTL plus refresh revocation, or maintain a denylist of revoked token IDs (jti) with entries expiring at the token's natural expiry so the list stays small.

**Recap:** pick opaque sessions when instant revocation matters and stateless JWTs when cross-service scale matters, then use the hybrid (short JWT + revocable refresh token) with rotation and reuse detection to kill stolen tokens, keep tokens in HttpOnly/Secure/SameSite cookies or a BFF (never localStorage), and validate JWTs strictly (no alg:none, check aud/iss/exp, rotate via JWKS).
`.trim()

const authzRbacRebacTeach = `
## Authorization is per-object, and getting it wrong tops OWASP

Authentication answers "who are you"; authorization answers "are you allowed to do this to *this specific object*." Getting authorization wrong is the number one item on the OWASP API Security Top 10 (Broken Object Level Authorization, aka BOLA/IDOR), so interviewers probe it hard. The first decision is which model expresses your permissions.

## RBAC, ABAC, ReBAC

**RBAC (Role-Based Access Control)** assigns users to roles (admin, editor, viewer) and roles to permissions. It is simple, auditable, and correct for coarse, org-wide access. Its failure mode is **role explosion**: the moment permissions depend on *which* object, you start minting roles like \`editor-of-folder-4821\`, and a company with a million folders needs a million roles. RBAC has no notion of "editor of *that* document."

**ABAC (Attribute-Based Access Control)** decides from attributes of the subject, resource, action, and environment ("allow if \`user.department == doc.department\` and \`time < 18:00\`"). It is expressive and great for compliance rules, but policies get hard to reason about and hard to answer the reverse question "who can see this doc?" because there is no stored relationship, just a function evaluated at request time.

**ReBAC (Relationship-Based Access Control)** models permissions as a graph of relationships between objects and users. This is what Google's **Zanzibar** paper formalized and what powers Drive, Docs, Calendar, and YouTube. Permissions are stored as **relation tuples**: \`object#relation@user\`, for example \`doc:readme#viewer@user:alice\` or \`doc:readme#parent@folder:eng\`. Relations compose: a folder's \`viewer\` can be *inherited* by every child doc via a userset rewrite ("a doc's viewer = its own viewers UNION its parent folder's viewers"). Groups are just more tuples: \`group:eng#member@user:alice\`, and \`doc:readme#viewer@group:eng#member\` grants the whole group. This naturally expresses sharing, nested folders, and org roles without role explosion. Open-source implementations are **OpenFGA**, **SpiceDB** (both Zanzibar-modeled), and AWS **Cedar**.

A Zanzibar-style system answers two query shapes: **Check** ("can alice view doc:readme?") walks the relationship graph, and **Expand / reverse-index** ("list every doc alice can view" or "list every user who can view this doc") which powers search filtering and share dialogs. It must return decisions in single-digit milliseconds because every request blocks on it.

## Separate the PDP from the PEP

Whatever model you pick, separate the **Policy Decision Point (PDP)** from the **Policy Enforcement Point (PEP)**. The PEP lives in each service or gateway and asks the PDP "allowed?"; the PDP (OPA, Cedar, OpenFGA) owns the policy logic. Externalizing authz means one place to audit and change rules instead of \`if user.isAdmin\` scattered across 50 services.

\`\`\`
  request -> PEP (in service/gateway) --check(user, action, object)--> PDP (OpenFGA/OPA/Cedar)
                                                                         |
                                       relation tuples / policy + graph -+
\`\`\`

Non-negotiable enforcement principles: **deny by default**, **least privilege**, **fail closed** (if the PDP is unreachable, reject, do not wave the request through). And enforce at **every trust boundary and every object**, not once at the front door.

**Interview nuance:** the classic wrong turn is treating authz as a single gate. A route checks \`user.isLoggedIn\`, then the handler does \`SELECT * FROM docs WHERE id = :id\` with the id straight from the URL, never checking that *this* user may see *that* doc. That is IDOR/BOLA. The fix is a per-object check on every access: \`check(user, "view", doc)\` before returning it. Zanzibar also has a subtle consistency problem, the **"new enemy"** problem: if you remove someone's access and then change the object, a stale cache could let the just-removed user read the new content. Zanzibar solves it with **zookies**, opaque consistency tokens that pin a check to a snapshot at or after the ACL change.

**Recap:** use RBAC for coarse org roles, ReBAC/Zanzibar (relation tuples, graph checks, reverse indexes via OpenFGA/SpiceDB) when permissions are per-object with sharing and nesting; split PDP from PEP, deny by default and fail closed, and enforce a per-object check on every request to kill IDOR.
`.trim()

const multiTenancyTeach = `
## Multi-tenancy: share infra cheaply, isolate data absolutely

Multi-tenancy is running many customers (tenants) on one platform. The whole game is making it economically cheap to share infrastructure while guaranteeing tenant A can *never* see tenant B's data. The core spectrum is **silo vs pool vs bridge**.

**Silo** gives each tenant dedicated infrastructure: their own database, sometimes their own cluster or even their own cloud account. Strongest isolation, easiest compliance story ("your data is in your own database"), simplest blast radius, but expensive and operationally heavy (you now patch and migrate N databases). **Pool** shares everything: one database, one schema, rows from all tenants in the same tables distinguished by a \`tenant_id\` column. Cheapest and most scalable, but isolation now depends entirely on your code and query discipline, one missing \`WHERE tenant_id = ?\` leaks everyone. **Bridge** is the middle: shared database, separate schema (or separate table set) per tenant. More isolation than pool, cheaper than silo, but schema-per-tenant stops scaling past a few thousand tenants (migrations across 5,000 schemas hurt).

\`\`\`
  SILO   dedicated DB/cluster per tenant   strongest isolation, highest cost
  BRIDGE shared DB, schema-per-tenant       middle ground
  POOL   shared schema, tenant_id column    cheapest, isolation is code-enforced
\`\`\`

The senior move is **tiered isolation**: pool your thousands of small self-serve SMB customers for cost efficiency, and silo your regulated enterprise customers (health, finance, government, data-residency requirements) into dedicated databases or accounts. One product, two isolation postures, sold as a premium tier.

## Enforce at the data layer, resolve context early

Wherever tenants share, isolation must be **enforced at the data layer, not just the app layer**, because app-layer checks are one forgotten \`WHERE\` clause from a breach. **Postgres Row-Level Security (RLS)** is the workhorse: you set \`current_setting('app.tenant_id')\` at the start of each request's transaction, and a policy \`USING (tenant_id = current_setting('app.tenant_id')::uuid)\` makes the database itself refuse to return other tenants' rows even if application SQL forgets the filter. Combine with per-tenant encryption keys (crypto-isolation) and connection/schema routing where the tenant maps to a database.

**Interview nuance:** the deciding detail is *where and when tenant context is resolved*. It must be established on **every request, before any business logic runs**, from a trusted source: the JWT/session claim or a subdomain (\`acme.app.com\`), never from a request body field the client can set. Then \`tenant_id\` propagates through the entire call chain (into the DB session var, into cache keys, into async job payloads, into log fields). If tenant context is derived late or from untrusted input, everything downstream is exploitable.

## The non-obvious leakage vectors

The part that separates a strong answer is where real multi-tenant breaches happen even when the primary DB path is perfect:

- **Caches:** a cache key of \`user:profile:42\` with no tenant prefix serves tenant B's cached object to tenant A. Every cache key must include \`tenant_id\`.
- **Search indexes:** Elasticsearch/OpenSearch queries need a tenant filter (or per-tenant index); a global search that forgets it returns everyone's documents.
- **Background jobs / async workers:** a job dequeued without its tenant context runs with ambient or wrong tenant, and RLS silently returns nothing or the wrong rows. Carry \`tenant_id\` in the job payload and re-establish context on pickup.
- **Shared/sequential IDs:** guessable global ids invite IDOR across tenants.
- **Log and metrics aggregation:** dumping raw payloads into a shared logging pipeline can expose tenant B's PII to tenant A's support view.

Finally, shared infra creates the **noisy neighbor** problem: one tenant's traffic spike starves everyone. Enforce **per-tenant quotas and rate limits** so tenants get fair-share isolation of *capacity*, not just data.

**Recap:** choose silo/pool/bridge per the cost-versus-isolation tradeoff (tier it: pool SMB, silo regulated); resolve tenant context from a trusted source on every request and propagate \`tenant_id\` everywhere; enforce at the data layer with Postgres RLS or per-tenant keys/routing; add per-tenant quotas for noisy neighbors; and hunt the non-obvious leaks in caches, search indexes, async jobs, ids, and logs.
`.trim()

const encryptionTransitMtlsTeach = `
## TLS 1.3 is the baseline

Encryption in transit protects data on every network hop against eavesdropping (confidentiality) and silent modification (integrity). The baseline is **TLS 1.3**. It matters because it dropped the insecure cruft that plagued TLS 1.2: no RSA key exchange, no static Diffie-Hellman, no CBC-mode ciphers, no renegotiation. Every 1.3 handshake uses ephemeral (Elliptic-Curve) Diffie-Hellman, which gives **forward secrecy**: even if an attacker records ciphertext today and steals your server private key next year, past sessions stay unreadable because the session keys were ephemeral and thrown away. The 1.3 handshake is also one round trip instead of two, which cuts connection latency noticeably at p99.

On top of the protocol you need cert hygiene. Serve a modern cipher suite only (AES-GCM or ChaCha20-Poly1305, both authenticated), send **HSTS** so browsers refuse to downgrade to plaintext HTTP, and automate issuance and rotation with **ACME** (Let's Encrypt or an internal ACME CA). Manual cert renewal is how you get a 3 a.m. outage when a wildcard expires. Short lifetimes (90 days publicly, hours internally) shrink the damage window of a leaked key.

## mTLS gives every workload an identity

For **service-to-service** calls, ordinary TLS only proves the server's identity to the client. **Mutual TLS (mTLS)** makes both sides present certificates, so each workload cryptographically proves who it is. That cert becomes a portable **workload identity**: instead of "requests from inside the VPC are trusted," you get "this call came from the \`payments\` service, signed by our CA, cert not expired." A service mesh (Istio, Linkerd) or a sidecar (Envoy) typically issues short-lived certs (often 24 hours or less via SPIFFE/SVID) and rotates them automatically, so revocation is rarely needed because certs expire faster than you would notice a compromise.

\`\`\`
  north-south (edge)              east-west (internal)
  client --TLS1.3--> [LB/CDN]     svcA <==mTLS==> svcB
     terminate here?                 both present certs,
        |                            both verify against CA,
   re-encrypt to origin             short-lived, auto-rotated
\`\`\`

## Termination vs re-encryption

Terminating TLS at the edge load balancer or CDN lets it inspect, route, and cache, but the hop from the LB to your origin is now in the clear unless you re-encrypt. For sensitive data you terminate at the edge and open a **new TLS (or mTLS) connection** to the backend, so plaintext never crosses an untrusted segment. Inside a mesh, every pod-to-pod hop is re-encrypted with mTLS.

**Interview nuance:** revocation is the hard part of PKI. OCSP and CRLs scale poorly and can fail open, so the industry answer is **short-lived certificates** (expire before revocation would matter) rather than relying on revocation lists. Certificate pinning stops a rogue CA but is operationally brittle: pin the wrong cert or forget to rotate the pin and you brick your own clients, which is why mobile teams pin to a CA or backup key, not a single leaf.

**Recap:** baseline on TLS 1.3 for forward secrecy and downgrade protection, automate cert issuance and rotation, and use mTLS with short-lived certs to give every service a verifiable identity so you never trust the network alone.
`.trim()

const encryptionRestFieldTeach = `
## Encryption at rest makes stolen storage useless

Encryption at rest exists to make stolen storage useless: a lost disk, a leaked backup, or an exfiltrated database snapshot should decrypt to nothing. The critical design lever is **granularity**, because it decides how much a single breach exposes and what you can still do with the data.

## Envelope encryption is the engine

You do not encrypt terabytes directly with a master key. Instead a **Data Encryption Key (DEK)** encrypts the actual data, and a **Key Encryption Key (KEK)** living in a KMS or HSM wraps (encrypts) the DEK. You store the wrapped DEK next to the ciphertext; to read, you send the wrapped DEK to KMS, which unwraps it (the KEK never leaves the HSM), and you decrypt locally. This gives cheap key rotation (re-wrap DEKs, no data rewrite), a hardware-guarded root of trust, and per-tenant or per-record DEKs so one leaked DEK exposes one tenant, not everyone.

\`\`\`
 plaintext --AES-256-GCM(DEK)--> ciphertext   [stored together]
     DEK --wrap(KEK in KMS/HSM)--> wrapped DEK  [stored together]
     KEK  never leaves the HSM boundary
 breach of storage alone  => attacker has ciphertext + wrapped DEK, no KEK => useless
\`\`\`

## The granularity ladder

- **Full-disk / volume encryption** (LUKS, cloud EBS encryption). Protects a physically stolen disk. But a running app and anyone with DB access see full plaintext, so it does nothing against a compromised app or a leaked query result. Zero searchability cost.
- **Database TDE (Transparent Data Encryption).** The DB encrypts files/pages. Same weakness: it is transparent, so a valid connection reads plaintext. Protects backups and stolen data files. Full query/index functionality preserved.
- **Application / field-level encryption.** Your app encrypts specific columns (SSN, card number) before writing, so the DB only ever holds ciphertext. A stolen snapshot **and** a compromised DB both reveal nothing for those fields. The cost is **searchability**: you cannot do \`WHERE ssn = ?\` or range queries on a randomized-encrypted column.
- **Client-side / end-to-end (E2EE).** The client encrypts so the server never sees plaintext at all (Signal, WhatsApp, 1Password). Maximum protection, maximum functional cost: the server cannot search, index, or process the data, and you must solve key distribution and recovery.

The searchability tradeoff has a nuance: **deterministic** encryption (same plaintext to same ciphertext) allows equality lookups and joins but leaks which rows share a value and enables frequency analysis; **randomized** encryption (fresh nonce each time, the AES-256-**GCM** default) leaks nothing but kills search. Real systems use randomized for most fields and reach for deterministic, blind indexes, or dedicated searchable-encryption schemes only where lookup is required, accepting the leakage.

**Interview nuance:** "crypto-shredding" is how encryption meets **GDPR erasure and retention**. If each user's data is encrypted under a per-user DEK, deleting that one key makes all their data unrecoverable instantly, even copies sitting in backups, replicas, and archives you cannot practically hard-delete. So a per-tenant/per-user key hierarchy is not just breach isolation, it is your "right to be forgotten" mechanism. And remember to encrypt **backups and logs** too; a plaintext backup or a log line full of PII is the most commonly forgotten copy.

**Recap:** use envelope encryption with per-tenant/per-user DEKs wrapped by an HSM-held KEK, pick granularity (disk, TDE, field, E2E) by how much breach exposure and searchability you can trade, and design keys so crypto-shredding gives you instant, backup-proof erasure.
`.trim()

const secretsKmsTeach = `
## Secrets unlock everything else

Secrets (DB passwords, API keys, signing keys, TLS private keys) are the credentials that unlock everything else, so how you store, distribute, and rotate them is a top-tier design problem. The failure everyone starts with is secrets in **env vars, config files, or source control**. Those leak through git history, CI logs, crash dumps, \`/proc\`, and container images, and they cannot be rotated or audited. The first principle is a **dedicated secret store**: HashiCorp Vault, AWS/GCP Secrets Manager, or a cloud KMS.

## KMS vs HSM

A **KMS** is a managed key service with an API for encrypt/decrypt/sign where keys never leave the service. An **HSM** is the tamper-resistant hardware (often **FIPS 140-2 Level 3** certified) that actually holds the root keys; managed KMS is usually HSM-backed. The pattern is a **key hierarchy** with a hardware-backed **root of trust**: the HSM holds the root KEK, which wraps intermediate keys, which wrap DEKs. Nothing sensitive exists in plaintext outside the hardware boundary, and you get a single audited choke point for every key operation.

## Rotation without downtime

Naive rotation ("change the password, restart everything") causes an outage the moment the old credential dies before every client picks up the new one. The fix is **versioned secrets with a dual-secret (overlap) window**: create version N+1 while N still works, roll consumers over gradually, confirm nothing uses N, then revoke N. For encryption keys, decrypt with old-or-new during the window and re-encrypt lazily. This turns rotation from a risky event into a routine, reversible rollout.

## The "secret zero" problem

If every secret lives in Vault, the app needs a credential to authenticate to Vault, so what protects *that* credential? Bootstrapping trust with a long-lived static token just moves the problem and recreates the thing you were avoiding. The modern answer is **workload identity**: the platform vouches for the workload so no pre-placed secret is needed.

- On Kubernetes / cloud, the workload gets a **short-lived OIDC/JWT identity token** from the platform (IRSA on EKS, GKE Workload Identity), and the secret store trusts that issuer. No static credential is ever placed on the box.
- **SPIFFE/SPIRE** issues a cryptographic **SVID** (an X.509 cert or JWT) that attests the workload's identity, which Vault or a mesh accepts.

The workload then fetches **dynamic, short-lived secrets**: instead of a shared static DB password, Vault generates a unique DB credential that lives 1 hour and is auto-revoked. A leak is self-limiting, and every credential is traceable to one workload.

\`\`\`
 secret zero solved:
   platform (K8s/cloud) --signs--> short-lived OIDC/SVID for the pod
   pod --presents identity--> [Vault] --verifies issuer--> issues
        dynamic DB cred (TTL 1h), unique per pod, auto-revoked
   no static credential ever stored on the pod
\`\`\`

**Interview nuance:** rotation and dynamic secrets are useless without **least-privilege policies and per-access audit logging**. Every secret read should be logged (who, which workload, when) so a leak has a blast-radius answer, and policies should scope each workload to only the secrets it needs. Pair this with **leaked-credential scanning** (pre-commit hooks, GitHub secret scanning) to catch the static keys that inevitably slip through, and auto-revoke on detection.

**Recap:** put secrets in a dedicated store rooted in an HSM-backed KMS, rotate with versioned dual-secret windows so there is no downtime, solve secret zero with platform-issued workload identity that hands out short-lived dynamic secrets, and log every access under least-privilege policies.
`.trim()

const ddosRateAbuseTeach = `
## DDoS is at least two problems at two layers

The mistake juniors make is treating "DDoS" as one problem with one fix. It is at least two problems that live at different layers and need different defenses.

## L3/L4 volumetric attacks

These try to saturate your pipes or your connection tables: UDP reflection/amplification (DNS, NTP, memcached, giving 50x to 50000x amplification), SYN floods, ACK floods. Measured in Gbps and Mpps (millions of packets per second), a large one is hundreds of Gbps to multiple Tbps. You cannot absorb that on your origin. The defense is upstream and distributed: **anycast** advertises the same IP from hundreds of edge PoPs so an attack is split across the whole global network instead of hitting one datacenter, a **CDN/scrubbing center** (Cloudflare, AWS Shield Advanced, Akamai) filters malformed and reflected packets before they reach you, and for on-prem you can use **BGP flowspec** or a scrubbing provider to divert and clean traffic. SYN floods are handled with SYN cookies so no state is allocated until the handshake completes.

## L7 application floods

The sneaky ones: valid-looking HTTP requests that each cost you a database query or an expensive render. A few thousand well-chosen requests per second to a search endpoint can take you down while looking like normal traffic at the network layer. Here you need a **WAF** (rule and signature matching, OWASP core ruleset), **behavioral rate limits** per identity, IP reputation and ASN blocking, and a **graduated challenge**: suspicious clients get a JS challenge or a managed CAPTCHA, and truly abusive ones get proof-of-work (make the client burn CPU before you spend a query). The graduated response matters because you do not want to CAPTCHA your real users.

## Rate-limiting algorithms

\`\`\`
  token bucket    : refill R tokens/sec, capacity B; allows bursts up to B, smooths to R
  sliding window  : count requests in the trailing T seconds; accurate, more memory
  fixed window    : count per calendar minute; cheap but allows 2x burst at the boundary
\`\`\`

Token bucket is the usual default (bursty but bounded). Apply limits on multiple **dimensions**: per API key, per user, per IP, per endpoint, and offer **tiered quotas** (free 100 req/min, pro 10k req/min). Store counters in Redis with atomic Lua scripts so the check is one round trip.

## Fail-open vs fail-closed

If your Redis limiter store is down, do you allow all traffic (fail-open, availability first, risk letting an attack through) or block all traffic (fail-closed, safety first, risk a self-inflicted outage from a Redis blip)? For a general public API you usually fail-open with a conservative local fallback limit so a limiter outage does not become a total outage; for a login or payment endpoint you fail-closed because letting abuse through is worse.

**Interview nuance:** name **economic denial-of-service (denial of wallet)**. If your response to load is to autoscale, an attacker who cannot take you down can still make you spend: they drive traffic, you scale to 500 instances, and the bill (or your serverless invocation count) explodes. Cap autoscaling, put a cache/CDN in front to shed load cheaply, and set billing alarms.

**Recap:** split defenses into L3/L4 volumetric (anycast, CDN/scrubbing, SYN cookies, BGP) and L7 application (WAF, behavioral limits, graduated challenges); rate-limit with token bucket on multiple dimensions and tiered quotas in Redis; return 429 with Retry-After; decide fail-open vs fail-closed per endpoint; and cap autoscaling so you do not denial-of-wallet yourself.
`.trim()

const botFraudAtoTeach = `
## Intent hiding inside legitimate-looking traffic

DDoS is about volume. This lesson is about **intent hiding inside legitimate-looking traffic**: an attacker doing exactly what a real user does, just automated and at scale. Rate limits alone will not catch it because each individual request looks fine.

## Credential stuffing and account takeover

Attackers take username/password pairs leaked from other breaches (billions are public) and replay them against your login, because people reuse passwords. A few percent succeed. Defenses stack:

- **Breached-password checks** at login and signup (check against a corpus like Have I Been Pwned's k-anonymity API) so a known-leaked password is rejected or force-reset.
- **MFA**, ideally phishing-resistant (WebAuthn/passkeys, TOTP over SMS). This is the single highest-leverage control against ATO.
- **Velocity and impossible-travel checks.** Track login attempts per account, per IP, and per device. "Failed logins across 5000 accounts from one IP in a minute" is stuffing. "Login from New York, then London 20 minutes later" is impossible travel and a hijack signal.

## Bot management, Sybil, and card testing

**Bot management** is detecting automation itself. Signals: **device fingerprinting** (TLS/JA3 fingerprint, browser and header entropy, canvas fingerprint), **behavioral signals** (mouse movement, typing cadence, time-on-form, since bots fill a form in 50 ms), and **invisible challenges** that run before you ever show a CAPTCHA. These feed a **risk score**, not a binary verdict.

**Fake-account / Sybil defense.** One attacker creating thousands of accounts to farm signup bonuses, post spam, or launder fraud. You cannot stop account creation, so you raise its cost and reduce its value: **phone/email verification** (a phone number costs more to acquire than an email), **per-identity and per-device velocity limits** (N accounts per device per day), **reputation and aging** (new accounts have limited privileges until they build trust), and rejecting disposable-email and VOIP-number ranges.

**Card testing** on checkout: fraudsters validate stolen card numbers by running many tiny authorizations. Defend with velocity limits per card/BIN/device, 3-D Secure step-up, and blocking the classic "many $1 auths, high decline rate" pattern.

## Graduated, risk-based response

The unifying idea is that every event gets a risk score from a pipeline of **features + rules + ML**. Low risk passes silently. Medium risk triggers **step-up auth** (MFA challenge, email verification, 3DS). High risk gets blocked or sent to a **manual-review queue**. Make every action **auditable and reversible** (you will have false positives and must be able to unblock a real user fast) and build a **feedback loop** so confirmed fraud and confirmed false positives retrain the model.

**Interview nuance:** the tradeoff to name explicitly is **friction versus conversion**. A hard block on anything suspicious kills signups and revenue and generates support tickets from real users. The senior move is graduated friction: invisible checks for the 95% who are clearly fine, a light challenge for the ambiguous middle, hard action only for high-confidence abuse. State the metric: you are optimizing fraud caught per unit of legitimate-user friction, not fraud caught in isolation.

**Recap:** layer breached-password checks, MFA, and velocity/impossible-travel against credential stuffing and ATO; use fingerprinting, behavioral signals, and invisible challenges for bots; raise cost and lower value (phone verification, per-device limits, reputation) against Sybil/fake accounts; score every event with features+rules+ML and respond with graduated, auditable, reversible step-up friction instead of blunt blocks.
`.trim()

const threatModelingZerotrustTeach = `
## Threat modeling and zero-trust are complementary

The two skills here are complementary: **threat modeling** is how you reason about attackers before you build, and **zero-trust** is the architecture you arrive at when you take the conclusions seriously.

## Threat modeling with STRIDE

You draw a **data-flow diagram** with **trust boundaries** (where data crosses from less-trusted to more-trusted, for example browser to API, API to database, your service to a third-party processor), then walk each element and each boundary crossing against the STRIDE categories:

\`\`\`
  S  Spoofing               pretending to be another identity        -> authentication
  T  Tampering              modifying data or code in transit/rest    -> integrity (signing, hashes, TLS)
  R  Repudiation            denying an action you took                -> audit logging, non-repudiation
  I  Information disclosure  leaking data                             -> encryption, access control
  D  Denial of service      degrading availability                    -> rate limits, quotas, redundancy
  E  Elevation of privilege gaining rights you should not have        -> authorization, least privilege
\`\`\`

Each STRIDE category maps to a defense property, so the exercise systematically surfaces gaps instead of relying on whoever remembers to think about security. You prioritize the resulting threats (likelihood x impact, or DREAD) and only mitigate what matters.

## Secure-design principles

The principles you apply to the mitigations: **least privilege** (each component gets the minimum access it needs), **defense in depth** (layered controls so one failure is not fatal), **fail secure** (on error, deny rather than allow), **complete mediation** (check authorization on every access, not once at the start), **secure defaults** (safe out of the box, opt into risk), and **assume breach** (design as if the attacker is already inside).

## Zero-trust

The old model was a hard perimeter with a soft interior: get past the VPN/firewall and the internal network trusts you. That fails because one phished laptop or one compromised service inside the perimeter can then talk freely to everything (**lateral movement**), and the blast radius is the whole network. Zero-trust, popularized by Google's **BeyondCorp**, flips it: **never trust, always verify**. There is no privileged network location. Every request, including internal east-west service-to-service traffic, is authenticated and authorized on its own merits.

Concretely for microservices: give every workload a cryptographic **identity** (**SPIFFE/SPIRE**, or cloud IAM roles), and enforce **mTLS** for all service-to-service calls via a **service mesh** (Istio, Linkerd, Consul) so both sides prove who they are and traffic is encrypted and its identity is verified. Replace the VPN with an **identity-aware proxy** (BeyondCorp-style, or Cloudflare Access / Google IAP) that authenticates the user and device on every request to internal apps. Add **micro-segmentation**: default-deny network policy so service A can reach only the specific services it needs, not the whole subnet.

The payoff is **blast-radius containment**. If one service is compromised, it holds a narrowly scoped identity, can reach only its explicit dependencies, and every call it tries is authenticated and logged, so lateral movement is slow, loud, and bounded instead of instant and silent.

**Interview nuance:** the classic wrong turn is **bolting security on at the end** ("we will add auth before launch"). Threat modeling is valuable precisely because it is done at design time, when changing a trust boundary is a diagram edit rather than a rewrite. And the classic zero-trust misconception is that it is a product you buy; it is an architecture principle (verify every request, no implicit network trust) that mTLS, identity-aware proxies, and micro-segmentation implement.

**Recap:** STRIDE walks a data-flow diagram's trust boundaries to surface spoofing/tampering/repudiation/info-disclosure/DoS/elevation threats, each mapping to a defense; apply least privilege, defense in depth, fail secure, complete mediation, secure defaults, and assume-breach; and implement zero-trust (never trust, always verify) with workload identity, mTLS via a service mesh, identity-aware proxies replacing VPNs, and micro-segmentation to contain lateral movement and blast radius.
`.trim()

const complianceFrameworksTeach = `
## Every framework is a list of architectural constraints

Compliance frameworks feel like legal noise until you realize each one is really a list of architectural constraints. The senior move is to map every framework to the concrete controls it forces, then notice how much they overlap so you build one control set that satisfies several regimes.

\`\`\`
Framework   Protects              Core demand on architecture
GDPR/CCPA   EU/CA personal data   Data-subject rights (access, erasure), lawful basis, residency
SOC 2       customer trust        Trust Services Criteria, controls that operate over time, evidence
HIPAA       US health PHI         Safeguards for PHI, BAAs with every processor, audit controls
PCI-DSS     cardholder data       Isolate/encrypt PAN, network segmentation, scope reduction
\`\`\`

## The shared baseline

Encryption in transit (TLS 1.2+) and at rest (AES-256 with KMS-managed keys), least-privilege access control (RBAC/ABAC with MFA), centralized logging and monitoring, tested backups and DR, vendor/processor management, and change management show up in all four. Build those once and you have cleared most of the surface area. Then you layer the framework-specific non-negotiables: GDPR needs a lawful basis and honored data-subject rights; HIPAA needs a signed BAA (Business Associate Agreement) with every subprocessor that touches PHI; PCI needs network segmentation isolating the cardholder data environment; SOC 2 needs the controls to demonstrably operate over a period, not just exist on audit day.

## Data residency is the load-bearing requirement

The single most architecturally load-bearing requirement is **data residency**. GDPR restricts moving EU personal data outside approved regions. This is not a config checkbox, it is a sharding decision. It forces you to region-pin storage and processing so EU user data lives in eu-central-1 and never silently replicates to us-east-1. Cross-border transfer needs a legal mechanism (Standard Contractual Clauses, or an adequacy decision like the EU-US Data Privacy Framework), and that legal mechanism only works if your architecture can actually keep the data regional. Teams that treat residency as a checkbox discover it late, when a global DynamoDB table or a CDN log has already scattered EU data across continents.

**Interview nuance:** the sharpest scope-reduction lever is **tokenization**. If you never store the raw card number (PAN), and instead hand it to a PCI-certified provider (Stripe, Adyen) that returns a token, then most of your systems fall out of PCI scope entirely. Your database holds \`tok_1a2b\`, not a card. The same idea reduces GDPR and HIPAA blast radius: the less sensitive data you hold, the fewer systems the auditor examines. Data minimization is a security control, not just a privacy nicety.

Rounding it out: DPAs (Data Processing Agreements) govern each processor, DPIAs (Data Protection Impact Assessments) are required before high-risk processing, and SOC 2 evidence means access reviews, change tickets, and log retention you can produce on demand.

**Recap:** build the shared baseline (encryption, access control, logging, backups) once, layer framework-specific non-negotiables on top, treat data residency as a regional-sharding driver rather than a checkbox, and use tokenization to pull whole systems out of PCI/PHI scope.
`.trim()

const piiDsarPrivacyTeach = `
## Erasure is hard because PII is never in one place

GDPR gives users the right to see their data and the right to be forgotten. Honoring the second one, erasure within 30 days across every store, is one of the hardest data-engineering problems most companies quietly fail at, because a user's PII is never in one place.

## Step one: know where it lives

You cannot delete what you cannot find. This demands a data inventory and classification: a catalog (DataHub, Amundsen, AWS Glue Data Catalog, or a home-grown registry) that tags every field as PII, sensitive, or non-sensitive, and records which datastore, table, and column holds it. Without this, "delete the user" is a guess. Mature teams enforce classification at write time so new PII columns cannot appear uncatalogued.

## Step two: the rights machinery

Beyond access (DSAR) and erasure, GDPR grants rectification (fix wrong data), portability (export in a machine-readable format), and consent withdrawal. Model these as an orchestrated workflow keyed on a stable \`user_id\`, with a queue that fans a request out to every system of record and tracks completion, because a 30-day legal deadline needs a status you can audit, not an email thread.

## Step three: delete every copy (the hard part)

A single user lives in the primary DB, read replicas, Redis caches, an Elasticsearch/OpenSearch index, the analytics lake (S3/Parquet), message queues, application logs, and third-party processors (Stripe, Segment, your email provider). Erasure has to reach all of them. Live stores you delete directly. Search indexes you re-index or delete by query. Third parties you call their deletion API and record the confirmation.

Backups are the killer. You cannot surgically edit a Postgres snapshot from three weeks ago, and you should not (immutable backups are a ransomware defense). The answer is **crypto-shredding**: encrypt each user's data with a per-user data key, store those keys in a KMS, and to "erase" the user, destroy their key. The ciphertext still sits in old backups but is now unrecoverable noise, which regulators accept as effective erasure. This is the single most important pattern in this lesson.

\`\`\`
Erasure request(user_id)
   -> live DBs / replicas: DELETE rows
   -> caches (Redis): evict keys
   -> search (OpenSearch): delete by query
   -> lake (S3/Parquet): tombstone + compaction rewrite
   -> third parties: call deletion API, store receipt
   -> backups: DESTROY per-user KMS key (crypto-shred)
\`\`\`

**Retention conflicts** are real: tax law may require keeping transaction records for 7 years even after an erasure request. You cannot honor both blindly, so policy is per-field. You erase the marketing profile and contact info while retaining the legally-mandated financial record (often pseudonymized), and you document the lawful basis for what you keep.

**Interview nuance:** know the three de-identification tiers precisely. **Anonymization** is irreversible: strip identifiers so no one can re-link (truly anonymized data leaves GDPR scope). **Pseudonymization** replaces identifiers with a reversible token, key held separately, still personal data under GDPR. **Tokenization** is a form of pseudonymization for a specific field. For sharing analytics safely, add **k-anonymity** (each row indistinguishable from at least k-1 others) or **differential privacy** (inject calibrated noise so no individual's presence changes an aggregate). Aggregates alone are not safe: a single-row group re-identifies instantly.

**Recap:** catalog every copy first, orchestrate rights on a stable user_id, delete across all live stores plus third parties, crypto-shred to handle backups, resolve retention conflicts per-field, and pick anonymization vs pseudonymization deliberately with k-anonymity or differential privacy for shared analytics.
`.trim()

const auditSupplychainTeach = `
## Prove what happened, block the obvious, trust nothing you did not build

Three defenses that share a theme: prove what happened, block the obvious attacks, and trust nothing you did not build yourself.

## Tamper-evident audit logging

An audit log records who did what to which resource when, and its whole value is that it cannot be quietly altered after the fact, including by an insider or an attacker who gained admin. So it must be separate from application logs and tamper-evident. Two techniques: **hash chaining**, where each entry stores a hash of its contents plus the previous entry's hash, so altering or removing any record breaks the chain and is detectable (the same idea a blockchain uses); and **WORM storage** (write-once-read-many, for example S3 Object Lock in compliance mode), which the storage layer itself refuses to overwrite or delete before a retention date. Combine them: write to WORM and chain the hashes.

What to capture per event: actor (user or service identity), action, resource, timestamp, source IP/session, and result (success or failure). Critically, keep PII and secrets **out** of the audit log. The log is widely readable for investigations and retained for years, so a password or SSN in it is a second breach waiting to happen. Log that user 123 viewed record 456, not the record's contents.

\`\`\`
{ ts, actor, action, resource, source_ip, result, prev_hash, hash }
   -> append-only stream -> WORM store (S3 Object Lock) + hash chain
\`\`\`

## OWASP application defenses at the gateway

The OWASP API Security Top 10 is the standard checklist. The one interviewers hammer is **BOLA (Broken Object Level Authorization)**, also called IDOR: the server returns object 456 because the URL asked for it, without checking that this caller owns 456. The fix is an authorization check on every object access, \`caller owns resource\`, never trusting an ID from the client. Others: input validation and parameterized queries (SQL injection), blocking **SSRF** (validate and allowlist any URL the server fetches, or an attacker pivots to your cloud metadata endpoint), and **mass assignment** (never bind a request body straight onto a model, or a user sets \`isAdmin=true\`). Centralize what you can at the API gateway (schema validation, rate limits, auth) but object-level authorization has to live in the service that knows ownership.

**Interview nuance:** BOLA is the number-one API risk precisely because it is invisible in a happy-path demo. It only appears when you ask "what if I change the ID in the URL to someone else's?" Say that sentence in an interview.

## Supply-chain security

Most of your running code is dependencies, so you must secure what you did not write. **SBOM** (Software Bill of Materials, SPDX or CycloneDX) inventories every component so when the next Log4Shell drops you can answer "are we affected?" in minutes. **SCA scanning** flags known-vulnerable dependencies in CI. **Artifact/image signing** with Sigstore/cosign lets deploys verify an image was built by your pipeline, not swapped by an attacker, and **SLSA provenance** attests how and from what source an artifact was built.

**Workload identity kills long-lived secrets.** Instead of a static API key in an env var (which leaks, never rotates, and grants standing access), services get short-lived credentials from their identity. **SPIFFE/SPIRE** issues cryptographic service identities, and cloud **OIDC federation** lets a GitHub Actions job or a pod exchange its identity for a 15-minute cloud credential. No static key to steal.

**Recap:** make audit logs separate, append-only, hash-chained and WORM-stored with actor/action/resource but no PII; defend BOLA/injection/SSRF/mass-assignment (BOLA first); and secure the supply chain with SBOM, SCA, signing, SLSA provenance, and workload identity for short-lived creds.
`.trim()

const incidentBreachResponseTeach = `
## Panic causes two classic mistakes

When a key or credential is compromised, panic causes two classic mistakes: wiping systems immediately (destroying the evidence you need) and doing a hard key cutover (logging every user out). A senior responder runs a disciplined loop instead.

## The NIST-style loop

\`\`\`
Detection  -> know something is wrong
Containment-> stop the bleeding without destroying evidence
Eradication-> remove the foothold, rotate secrets
Recovery   -> restore trusted state, watch for reinfection
Lessons    -> blameless postmortem, fix root cause
\`\`\`

**Detection.** Feed everything into centralized logging or a SIEM (Splunk, Elastic, a cloud-native equivalent) and alert on anomalous key usage: geo-velocity impossibilities (the key signs from two continents a minute apart), unusual volume, or calls at odd hours. Seed **honeytokens** (a fake credential that should never be used, so any use is a certain intrusion signal). And plan for the humbling reality that an outside party (a researcher, a customer, law enforcement) often notifies you first, so build an intake path for external reports.

**Containment without destroying evidence.** Isolate affected systems (pull them from the load balancer, cut network egress) and revoke active sessions, but do not wipe yet. This is the phase where the discipline matters most.

## Rotate a widely-used key without downtime

If one signing key protects every session and you just delete it, every valid token instantly becomes invalid and the whole userbase is logged out. The answer is to design for **overlapping key validity** ahead of time. Publish keys via a **JWKS** (JSON Web Key Set) endpoint with a key id (\`kid\`) in each token header. To rotate: (1) add the new key to the JWKS so verifiers accept both old and new, (2) flip signing to the new key, (3) after tokens signed with the old key have expired, remove the old key. Because verifiers trust both during the overlap, nobody is logged out. Under compromise you compress this: shrink token TTLs immediately so old tokens age out fast, force re-authentication for genuinely affected sessions, and pull the compromised \`kid\` from the JWKS. Short-lived credentials from a secrets manager (Vault, cloud KMS) make this routine rather than heroic.

**Eradication and recovery.** Remove the attacker's foothold, rotate all potentially-exposed secrets, then restore from a known-good state and watch closely for reinfection. This is where **immutable, object-locked backups** pay off: if the attacker also ran ransomware, a ransomware-resistant backup is your clean recovery path.

## Forensics and the legal clock, in parallel

The instant you suspect a breach, evidence preservation starts: snapshot affected volumes and preserve immutable logs **before** you clean anything, and maintain chain of custody so the evidence holds up later. Simultaneously the regulatory clock starts: **GDPR requires notifying the supervisory authority within 72 hours** of becoming aware of a qualifying breach, and affected users without undue delay if there is high risk. So legal and comms are named roles in the runbook, activated at hour zero, not consulted after cleanup.

**Interview nuance:** the trap is optimizing for "fix it fast." Wiping and rebuilding immediately feels decisive but destroys forensics and, with a hard key cutover, causes a self-inflicted outage on top of the breach. The strong answer sequences containment before eradication, rotates keys via overlapping validity, and runs forensics and the 72-hour legal clock in parallel from the start.

**Recap:** run detection, containment, eradication, recovery, lessons in order; rotate the compromised key via overlapping JWKS validity plus shortened TTLs so nobody is logged out; preserve evidence before cleanup with chain of custody; and start the GDPR 72-hour notification clock the moment you become aware.
`.trim()

export const systemDesignLevel8: DesignLevel = {
  id: 8,
  slug: "security-privacy",
  title: "Level 8: Security, Privacy & Multi-tenancy",
  tagline:
    "Authentication and identity, authorization and tenancy, encryption and secrets, abuse and perimeter defense, and privacy, compliance, and audit.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l8-m1",
      title: "Authentication & Identity",
      description:
        "Design an identity service that survives a full database dump, add phishing-resistant passkeys to an existing password login, pick the correct OAuth 2.1 grant for web, mobile, machine-to-machine, and device clients, and design a session and token lifecycle where a stolen credential can actually be revoked before it does damage.",
      lessons: [
        {
          id: "sd-l8-auth-credentials",
          title: "Authentication Fundamentals & Credential Handling",
          summary:
            "Hash passwords with a memory-hard KDF plus per-user salt (and a KMS pepper) so a DB dump is useless, layer MFA with SMS as the weak factor, harden account recovery because it is the real attack surface, and stop credential stuffing with breach checks and throttling while never revealing whether an account exists.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["authentication", "password-hashing", "mfa"],
          teach: {
            markdown: authCredentialsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-auth-credentials-apply",
            prompt:
              "Design a login/identity service for 100M users that supports password + MFA and survives a database dump without exposing usable credentials.",
            thinkAbout: [
              "Which password hashing and salting choices survive a breach?",
              "Why is account recovery the real attack surface?",
              "How do you defend against credential stuffing without user enumeration?",
            ],
            modelAnswerOutline: [
              "Assumptions: 100M accounts, peak maybe 5k logins/sec, web and mobile clients, and the threat model explicitly includes a full offline copy of the users table plus its backups.",
              "**Storage:** a `users` table with `(id, email_normalized UNIQUE, password_hash, mfa_secret_encrypted, created_at)`. `password_hash` is argon2id tuned to about 50 to 100 ms per verify with a unique 16-byte per-user salt encoded in the hash string. Add a global pepper stored in a KMS (AWS KMS or Vault), not in the database, so a stolen table plus stolen backups still cannot crack a single password. Never store plaintext, and never 'encrypt' passwords; hashing is one-way by design.",
              "**Login flow:** normalize the email, look up the user, and run a constant-time argon2id verify. Return an identical generic error and near-identical timing whether the user is missing or the password is wrong, to kill enumeration. On success, if MFA is enrolled, require the second factor. Default MFA to TOTP or a hardware key or passkey; offer SMS only as a fallback and flag it as weaker due to SIM-swap. Use risk-based step-up so a trusted device is not prompted every time but a new device, new geo, or sensitive change is.",
              "**Credential-stuffing defense:** on signup and password change, reject known-breached passwords via the HIBP k-anonymity range API (only a hash prefix leaves your system). Rate-limit per account and per source IP with exponential backoff, add a device/behavior risk score, and trigger CAPTCHA on anomalous volume. Log auth events for anomaly detection.",
              "**Account recovery, the real weak link:** reset uses a single-use, signed, 15-minute token delivered to a verified channel, is rate-limited, and re-verifies a second factor before allowing password or MFA changes. Support-driven recovery requires identity proofing, not just 'I forgot,' because social engineering of support is a top real-world compromise path.",
              "Common wrong turn: reaching for MD5 or SHA-256 'because it is a hash,' or returning 'no such user' on login. Both are instant disqualifiers: fast hashes make a dump crackable, and distinct errors hand attackers a valid-account oracle.",
            ],
          },
          practice: {
            id: "sd-l8-auth-credentials-practice",
            prompt:
              "Design the credential and MFA layer for a crypto exchange like Coinbase where a single account compromise can drain irreversible funds, at 50M users, and specify how you defend against MFA-fatigue and SIM-swap attacks on the highest-value accounts.",
            thinkAbout: [
              "Why is authentication necessary but not sufficient for irreversible actions?",
              "How do number-matching prompts and banning SMS defeat MFA-fatigue and SIM-swap?",
              "What time-delay and out-of-band controls sit on top of strong factors?",
            ],
            modelAnswerOutline: [
              "Assumptions: irreversible on-chain withdrawals, so account takeover equals permanent loss, and high-value accounts are actively targeted. The correctness bar is much higher than a typical consumer app.",
              "**Credentials:** argon2id at an aggressive cost (target 100 ms+), unique per-user salt, and a pepper in an HSM-backed KMS. Because withdrawals are irreversible, treat authentication as necessary but not sufficient: bind sensitive actions to a second gate.",
              "**MFA:** default to hardware security keys or device-bound passkeys (phishing-resistant, no shared secret to steal). Support TOTP as second choice. Ban SMS entirely for withdrawal authorization; if allowed for login at all, block SIM-swap by not permitting SMS as the factor that authorizes moving money. Defeat MFA-fatigue push bombing by using number-matching prompts (the user types a code shown on the login screen) instead of tap-to-approve, and rate-limit push challenges.",
              "**Defense in depth for money movement:** a withdrawal requires step-up re-authentication with the strongest enrolled factor, plus an address allowlist with a 24 to 48 hour hold on newly added addresses, plus an out-of-band notification on every change. New-device logins trigger a cooling-off period before withdrawals are allowed. Even a full credential and session compromise cannot instantly drain funds; the attacker still has to beat the withdrawal-time controls and the time delay, during which the real user gets alerted.",
              "**Recovery is locked down hardest:** no support agent can reset MFA on a high-value account without multi-step identity proofing and a mandatory delay, because support social engineering is the documented path used to drain exchange accounts. The theme: authentication strength scales with the blast radius of the action, and irreversible actions get time delays and out-of-band confirmation on top of strong factors. Common wrong turn: treating MFA as a single on/off switch and accepting SMS OTP for high-value withdrawals, which leaves SIM-swap and support-desk reset as an unguarded path straight to irreversible funds.",
            ],
          },
        },
        {
          id: "sd-l8-passkeys-webauthn",
          title: "Passwordless, Passkeys & WebAuthn/FIDO2",
          summary:
            "Passkeys replace shared secrets with a device-held private key so the server stores only a useless-to-steal public key, origin binding makes them phishing-resistant where OTP and SMS are not, synced passkeys solve device loss for consumers while device-bound plus attestation suits enterprise, and you roll them out via progressive enrollment alongside passwords.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["passkeys", "webauthn", "fido2"],
          teach: {
            markdown: passkeysWebauthnTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-passkeys-webauthn-apply",
            prompt:
              "Add passkey (WebAuthn) sign-in to an existing password system and design the fallback, device-loss, and cross-device sync story.",
            thinkAbout: [
              "Why is the public-key credential model breach-proof on the server?",
              "How does origin binding make passkeys phishing-resistant?",
              "How do you handle device loss and recovery?",
            ],
            modelAnswerOutline: [
              "Assumptions: an existing username/password base of, say, 20M users, web plus iOS and Android clients, and a goal of reducing account-takeover and phishing while not locking anyone out during the transition.",
              "**Data model:** add a `credentials` table `(id, user_id, credential_id, public_key, sign_count, transports, aaguid, created_at, last_used)`. A user can have many passkeys. Keep the existing `password_hash` column; passkeys coexist rather than replace on day one.",
              "**Registration flow:** after a normal login, prompt 'add a passkey.' Call WebAuthn `create` with a server-generated challenge, the relying-party ID (your domain), and a user handle. Store the returned public key and credential ID. The private key stays in the device's secure enclave and syncs via iCloud Keychain or Google Password Manager if the platform supports it. This is breach-proof server-side: even a full dump of the credentials table only exposes public keys, which cannot authenticate.",
              "**Login flow:** server issues a random challenge, the browser prompts the user's local gesture, the device returns a signed assertion, and the server verifies the signature against the stored public key and checks the origin. Because the credential is origin-bound, a phishing site cannot elicit or replay it, which defeats the real-time proxy attacks that beat TOTP and SMS.",
              "**Device loss and recovery, the crux:** encourage enrolling at least two passkeys (primary device plus a roaming hardware key or a second device). Synced passkeys survive a lost phone automatically because the private key is restored from the cloud on a new device. For users who lose everything, fall back to the existing account-recovery flow (verified email plus a second factor), then let them enroll a fresh passkey. Never make a device-bound passkey the only credential without a backup, or you manufacture permanent lockouts.",
              "**Transition:** progressive enrollment. Keep passwords valid, nudge passkey adoption, and once a user has two working passkeys let them optionally remove the password. Common wrong turn: calling SMS OTP 'MFA' and stopping there, without acknowledging that OTP and SMS are phishable and SIM-swappable, exactly the weakness passkeys remove.",
            ],
          },
          practice: {
            id: "sd-l8-passkeys-webauthn-practice",
            prompt:
              "Design passkey rollout for a large enterprise SSO (like Okta or Microsoft Entra) serving 5,000 corporate customers, where IT admins must enforce phishing-resistant auth for privileged roles but many employees share kiosk machines and some are contractors on unmanaged devices.",
            thinkAbout: [
              "Why does authenticator choice depend on device class (managed, kiosk, unmanaged)?",
              "Where does attestation earn its keep in an enterprise?",
              "How do SCIM provisioning and break-glass accounts fit the lifecycle?",
            ],
            modelAnswerOutline: [
              "Assumptions: B2B identity provider, per-tenant policy control, a mix of managed corporate devices, shared kiosks, and unmanaged contractor laptops, and a compliance requirement that admins and finance roles use phishing-resistant credentials.",
              "**Policy engine:** passkey enforcement is a per-tenant, per-role policy. Admins can require phishing-resistant authentication (passkeys or FIDO2 hardware keys) for privileged groups while allowing password plus TOTP for low-risk roles during transition. The IdP evaluates this policy at authentication time.",
              "**Authenticator strategy by device class:** on managed corporate devices, platform passkeys (Windows Hello, Touch ID) are ideal. On shared kiosks, platform passkeys are wrong because the credential would live on a shared machine, so require roaming FIDO2 hardware keys that the employee carries and taps in. For contractors on unmanaged devices, issue hardware keys or use device-bound passkeys with attestation so the tenant can require certified authenticators and reject unknown ones. This is where attestation earns its keep: enterprise can insist on specific AAGUIDs.",
              "**Recovery and lifecycle:** because employees churn, integrate with SCIM provisioning so joiners get enrolled and leavers are deprovisioned centrally. Require two enrolled authenticators for privileged users (a hardware key plus a backup) so a lost key does not strand an admin. Emergency access uses break-glass accounts with hardware keys stored in a safe, heavily audited.",
              "**Rollout:** enforce phishing-resistant auth first for the highest-risk roles (super admins, finance), then expand by cohort, keeping a fallback for everyone else until adoption is high. The theme: one policy engine, but authenticator choice is driven by device trust, shared machines demand roaming keys, and attestation lets a regulated tenant prove only approved hardware is in use. Common wrong turn: mandating platform passkeys for everyone at once, which locks out kiosk users and contractors on unmanaged devices who have no place to store a device-bound key and no fallback path.",
            ],
          },
        },
        {
          id: "sd-l8-oauth-oidc",
          title: "OAuth 2.1 & OpenID Connect",
          summary:
            "OAuth authorizes and OIDC (ID token) authenticates, OAuth 2.1 makes Authorization Code + PKCE mandatory and deletes implicit and password grants, you pick auth-code+PKCE for user apps, client-credentials for M2M, and device flow for TVs/CLIs, and you harden tokens with scopes, audience, state/nonce, and optionally DPoP/mTLS.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["oauth", "oidc", "sso"],
          teach: {
            markdown: oauthOidcTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l8-oauth-oidc-apply",
            prompt:
              "Design 'Sign in with X' plus third-party API access for a platform, choosing the correct grant flow and token strategy.",
            thinkAbout: [
              "What is the OAuth vs OIDC distinction?",
              "Which grant do you pick for web/SPA/mobile vs M2M vs devices?",
              "What did OAuth 2.1 make mandatory or remove?",
            ],
            modelAnswerOutline: [
              "Assumptions: a consumer platform with a web app, an SPA dashboard, native mobile apps, and some backend integrations that call partner APIs with no user present. We want social login and the ability to call third-party APIs on the user's behalf.",
              "**Two distinct needs, two answers.** 'Sign in with X' is authentication, so use OIDC: the user authenticates at the provider (Google/Apple), and we receive an ID token, a signed JWT we validate (issuer, audience, expiry, nonce, signature via the provider's JWKS) to establish who they are and provision or match a local account. Separately, calling a third-party API on the user's behalf is authorization, so we request an OAuth access token with narrowly scoped permissions and store it to make those API calls.",
              "**Grant selection:** for the web app, SPA, and mobile apps, use Authorization Code + PKCE. These are public clients, so PKCE binds the authorization code to the client and neutralizes code interception. Request minimal scopes and an audience matching the target API. For our own backend calling partner APIs machine-to-machine, use the Client Credentials grant with a client secret or, better, mTLS. If we ship a TV or CLI companion, use the Device Authorization grant.",
              "**Token strategy:** keep access tokens short-lived (5 to 15 minutes) and use refresh tokens for continuity. For SPAs, prefer a Backend-for-Frontend that holds tokens server-side and gives the browser only a session cookie, so tokens never touch JavaScript. For high-value APIs, use DPoP or mTLS sender-constrained tokens so a leaked token is not usable by a thief. Validate every token at the resource server: signature, `alg` (reject `none`), `iss`, `aud`, `exp`, and scope.",
              "**Security parameters:** always send `state` (CSRF), `nonce` (OIDC replay), and PKCE; require exact redirect-URI matching. For enterprise customers, support OIDC (or SAML) SSO plus SCIM provisioning so deprovisioning is automatic.",
              "Common wrong turn: saying 'we use OAuth' without naming a grant, or reaching for the Implicit flow, which OAuth 2.1 removed. Also wrong: using the ID token to call APIs (it is for authentication, not an API access token) or the access token to identify the user.",
            ],
          },
          practice: {
            id: "sd-l8-oauth-oidc-practice",
            prompt:
              "Design the OAuth architecture for a fintech platform like Plaid that connects to thousands of banks and exposes an API consumed by thousands of third-party developer apps, where you are simultaneously an OAuth client (to banks) and an OAuth provider (to your customers).",
            thinkAbout: [
              "How do the two OAuth roles (client to banks, provider to developers) differ?",
              "Why do sender-constrained tokens (FAPI/mTLS) matter on the bank leg?",
              "How does cascading revocation flow through the whole chain?",
            ],
            modelAnswerOutline: [
              "Assumptions: you sit in the middle. Upstream you are a client authorizing against thousands of bank authorization servers on behalf of end users; downstream you are the authorization server issuing tokens to thousands of developer apps that call your API. Both sides must be least-privilege and revocable.",
              "**As a client to banks:** each bank is a separate OAuth provider, often with open-banking profiles (FAPI, a hardened OAuth profile). Use Authorization Code + PKCE, request the narrowest scopes (read-only balances and transactions, not payment initiation unless needed), and store the resulting refresh tokens encrypted per user per institution. Because you hold long-lived access to sensitive accounts, sender-constrained tokens (mTLS, as FAPI mandates) matter: a leaked bearer token to a bank is catastrophic. Handle each bank's quirks (token lifetimes, re-consent requirements) behind an adapter layer.",
              "**As a provider to developers:** run your own authorization server. Register each developer app as a client with exact redirect URIs and per-app scopes (`transactions:read`, `identity:read`). Issue short-lived access tokens plus refresh tokens, and enforce per-client rate limits and audience-bound tokens so a token for one product cannot hit another. Provide a consent screen where the end user approves exactly which of their linked accounts and data a given app may access, and make revocation first-class.",
              "**Cross-cutting:** encrypt tokens at rest with envelope encryption and per-tenant keys, audit every token issuance and use, and design for cascading revocation: if a bank invalidates access, propagate that to every developer token that depended on it. The theme: least-privilege scopes on both legs, sender-constrained tokens for the high-value bank leg, and a revocation model that flows through the whole chain because you are brokering irreversible access to money.",
              "Common wrong turn: collapsing the two OAuth roles into one token set, so a single revocation reasons about only one leg and a revoked bank grant keeps working through still-valid developer tokens that depended on it.",
            ],
          },
        },
        {
          id: "sd-l8-sessions-tokens",
          title: "Sessions, Tokens & Token Lifecycle",
          summary:
            "Pick opaque sessions when instant revocation matters and stateless JWTs when cross-service scale matters, then use the hybrid (short JWT + revocable refresh token) with rotation and reuse detection to kill stolen tokens, keep tokens in HttpOnly/Secure/SameSite cookies or a BFF (never localStorage), and validate JWTs strictly.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["sessions", "jwt", "tokens"],
          teach: {
            markdown: sessionsTokensTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-sessions-tokens-apply",
            prompt:
              "Design session management for a web + mobile app: choose token format, storage, expiry, and instant revocation.",
            thinkAbout: [
              "Stateful opaque sessions vs stateless JWTs: what is the revocation-vs-scale tradeoff?",
              "How does refresh-token rotation with reuse detection work?",
              "Where should you never store a token?",
            ],
            modelAnswerOutline: [
              "Assumptions: a web SPA plus native mobile apps, a microservices backend, tens of millions of users, and a hard requirement to be able to revoke a compromised session promptly (not 'eventually in an hour').",
              "**Token model:** a hybrid. Issue a short-lived access token as a signed JWT with a 10-minute TTL carrying `sub`, roles, `aud`, `iss`, `exp`, and a `jti`. Services validate it statelessly against the JWKS public keys, so the hot path needs no session lookup and scales across services. Alongside it, issue a long-lived opaque refresh token (say 30 days) stored server-side in Redis keyed by a family ID. The short TTL bounds leak exposure, and the stateful refresh token is what I can actually kill.",
              "**Rotation and theft detection:** every refresh exchange issues a new access token and a new refresh token and invalidates the previous refresh token. All refresh tokens from one login share a family ID. If a spent refresh token is replayed, I detect reuse and revoke the whole family, logging everyone in that family out. This catches a stolen refresh token because the attacker's replay or the victim's next refresh will present an already-used token.",
              "**Storage, by client:** for the web SPA, keep tokens out of JavaScript entirely. Either use HttpOnly, Secure, SameSite=Lax cookies for the session, or a BFF where the browser holds only a session cookie and the server holds the OAuth tokens. Add anti-CSRF protection for state-changing requests. Never use localStorage; a single XSS would exfiltrate the token. For mobile, store the refresh token in the platform secure storage (iOS Keychain, Android Keystore).",
              "**Instant revocation:** on logout or a security event, delete the refresh-token family from Redis and add the active access token's `jti` to a short-lived denylist checked at the API gateway, with denylist entries expiring at the token's natural `exp` so the list stays bounded. Because access tokens live only 10 minutes, the denylist is small.",
              "**JWT hygiene:** pin the algorithm, reject `alg: none` and algorithm-confusion, verify `aud`/`iss`/`exp`, and rotate signing keys via JWKS. Common wrong turn: 'just use JWTs' with a long TTL and no revocation, so a leaked token cannot be killed. The fix is the short-access-plus-revocable-refresh hybrid.",
            ],
          },
          practice: {
            id: "sd-l8-sessions-tokens-practice",
            prompt:
              "Design the session and token system for a bank's mobile app used by 30M customers where a stolen phone or leaked token must never allow a fraudulent transfer, and where regulators require that you can terminate every active session for a user within seconds.",
            thinkAbout: [
              "How does a per-user 'sessions valid after' epoch give instant global logout?",
              "Why require step-up re-auth for money movement even with a valid session?",
              "How do sender-constrained tokens stop a lifted token from being replayed?",
            ],
            modelAnswerOutline: [
              "Assumptions: high-value, irreversible actions (transfers), a stolen-device threat model, and a regulatory requirement for near-instant, provable global session termination per user. Convenience must not override the ability to revoke.",
              "**Token model:** short-lived access tokens (5 minutes) as JWTs for the API hot path, plus opaque refresh tokens in server-side storage with rotation and reuse detection. But because the correctness bar is money, I do not rely on the JWT TTL alone for security-critical actions. Sensitive operations (transfers, adding a payee, changing contact info) require step-up re-authentication with a strong factor (passkey or device biometric bound via WebAuthn), so a stolen but still-valid session cannot move money without re-proving presence.",
              "**Instant global revocation:** maintain a per-user 'sessions valid after' timestamp (an epoch) in a fast store like Redis or DynamoDB replicated to every region. Every access token carries an issued-at, and the API gateway rejects any token issued before the user's current epoch. To terminate all sessions, bump the epoch: every existing token is invalid on its next request within seconds, across all devices and regions, which satisfies the regulator's 'kill everything now' requirement without waiting for TTL expiry. Refresh-token families are also purged so nothing can be renewed.",
              "**Sender-constraining:** bind tokens to the device with DPoP or mTLS so a token lifted off one device cannot be replayed from an attacker's client, and bind the refresh token to the device secure enclave (Keychain/Keystore).",
              "**Fraud controls layered on top:** newly added payees get a hold, out-of-band notifications fire on transfers and security changes, and anomalous device or geo triggers step-up and cooling-off before withdrawals. The theme: a JWT-plus-revocable-refresh hybrid gets you scale, but for irreversible money movement you add a per-user revocation epoch for instant global logout, sender-constrained tokens so leaks are not replayable, and mandatory step-up so a live session alone can never authorize a transfer.",
              "Common wrong turn: leaning on long-lived stateless JWTs with no revocation epoch, which means a stolen token stays valid until it expires and the regulator's 'terminate every session within seconds' requirement is impossible to meet.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l8-m2",
      title: "Authorization & Tenancy",
      description:
        "Choose the right authorization model (RBAC, ABAC, or ReBAC) for a product, enforce it correctly at every trust boundary without falling into IDOR, and design tenant isolation for a B2B SaaS that keeps small self-serve customers cheap while giving regulated enterprises the hard guarantees they demand.",
      lessons: [
        {
          id: "sd-l8-authz-rbac-rebac",
          title: "Authorization Models: RBAC, ABAC & ReBAC",
          summary:
            "Use RBAC for coarse org roles, ReBAC/Zanzibar (relation tuples, graph checks, reverse indexes via OpenFGA/SpiceDB) when permissions are per-object with sharing and nesting; split PDP from PEP, deny by default and fail closed, and enforce a per-object check on every request to kill IDOR.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["authz", "rebac", "zanzibar"],
          teach: {
            markdown: authzRbacRebacTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l8-authz-rbac-rebac-apply",
            prompt:
              "Design the permission system for a Google-Drive-style app with per-file sharing, groups, nested folders, and org roles.",
            thinkAbout: [
              "When does RBAC hit role explosion, and when does ReBAC fit?",
              "How does the Zanzibar model represent permissions?",
              "How do you avoid IDOR / broken object-level authorization?",
            ],
            modelAnswerOutline: [
              "Assumptions: tens of millions of users, hundreds of millions of files and folders, files shared with individuals and groups, folders nest arbitrarily deep with inherited permissions, org admins have blanket roles, and every read/write must be authorized in under ~10ms at the p99 because it is on the request path.",
              "**Model choice.** RBAC alone fails here: 'viewer of folder X' is per-object, so RBAC would need a role per folder (role explosion). This is a textbook **ReBAC / Zanzibar** problem. I model permissions as relation tuples of the form `object#relation@user`.",
              "**Schema.** Objects: `doc`, `folder`, `org`, `group`. Relations and userset rewrites: `folder#viewer`, `folder#editor`, `folder#parent@folder:...` for nesting; `doc#parent@folder:...` with `doc#viewer = doc's own viewers UNION doc#parent->viewer` (inheritance); `group:eng#member@user:alice` with group sharing as `doc:x#viewer@group:eng#member`; org roles `org:acme#admin@user:bob`, and `folder#viewer` can include `folder#org->admin` so admins see everything.",
              "**Serving.** I run OpenFGA or SpiceDB (or build the Zanzibar design directly). Two query paths: **Check(user, action, object)** walks up the parent chain and expands group membership, backed by an aggressively cached relation store (tuples in Spanner/Cassandra with a read-through cache). **Reverse index / ListObjects** answers 'which docs can alice open' to filter search and populate the file list. To hit sub-10ms I cache subproblem results, denormalize hot paths, and bound folder nesting depth.",
              "**Enforcement.** A Policy Enforcement Point in the API gateway and again in the file service; the PDP is the authz service. Every object access does a per-object `Check`, never a blanket 'is logged in' gate, which kills IDOR/BOLA (OWASP API #1). Deny by default, least privilege, fail closed if the authz service is down. Store a **zookie** with each object and pass it to Check so a revocation is not undone by a stale cache (the new-enemy problem).",
              "Common wrong turn: fetching the doc by URL id after only an authentication check, exposing every other user's files by incrementing an id. The reverse-index query is also easy to forget and it is what makes shared-with-me and search actually correct.",
            ],
          },
          practice: {
            id: "sd-l8-authz-rbac-rebac-practice",
            prompt:
              "Design the authorization layer for a GitHub-scale code host: 100M+ repositories, personal accounts and organizations, teams with nested subteams, per-repo roles (read/triage/write/maintain/admin), outside collaborators, and branch-protection rules, all authorized on every git and API operation with a sub-10ms p99 budget.",
            thinkAbout: [
              "How do you model the five per-repo roles as an implication chain rather than five booleans?",
              "How do nested subteams and three grant sources compose in a Check?",
              "Why is branch protection a policy overlay rather than pure ReBAC?",
            ],
            modelAnswerOutline: [
              "Assumptions: 100M+ repos, orgs owning teams that nest, five per-repo permission levels, individual outside collaborators, and both API and git-transport paths that must authorize on every push/fetch/read. This is ReBAC at scale, exactly GitHub's actual architecture.",
              "**Relation tuples.** `org:acme#member@user:alice`, teams as `team:acme/backend#member@user:alice` and nesting as `team:acme/backend#member@team:acme/platform#member` (subteam members inherit). Repo roles compose: `repo:acme/api#admin` implies `maintain` implies `write` implies `triage` implies `read`, so a Check for `read` succeeds if any higher relation holds (userset rewrite, not five separate tuples). Grants come from three sources unioned: direct collaborator (`repo:acme/api#write@user:bob`), team grant (`repo:acme/api#write@team:acme/backend#member`), and org base permission.",
              "**Serving.** A Zanzibar-style service (SpiceDB/OpenFGA-shaped) with the tuple store on a horizontally sharded, globally replicated DB plus a hot cache. Check walks: does the user hold the requested-or-higher relation directly, via any team (following subteam nesting), or via org role?",
              "**Branch protection as an overlay.** Branch-protection is a second policy layer evaluated on write: even a `write` user is denied a direct push to `main` if protection requires a PR, so I model it as an ABAC-style rule on top of the ReBAC decision, because it constrains *actions on a path*, not a relationship to the repo.",
              "**Enforcement.** The git front door (the SSH/HTTPS receive-pack path) and the API both call the PDP per operation; no operation trusts a prior gate. Deny by default, fail closed. Cache decisions with a consistency token so removing someone from a team revokes access without a stale-cache window.",
              "Common wrong turn: flattening the five roles into unrelated booleans, which loses the implication chain and forces the client to know that admin also means write; and modeling branch protection as pure ReBAC, which fails because it constrains actions on a path, not a relationship to the repo.",
            ],
          },
        },
        {
          id: "sd-l8-multi-tenancy",
          title: "Multi-Tenancy Isolation Models",
          summary:
            "Choose silo/pool/bridge per the cost-versus-isolation tradeoff (tier it: pool SMB, silo regulated); resolve tenant context from a trusted source on every request and propagate tenant_id everywhere; enforce at the data layer with Postgres RLS or per-tenant keys/routing; add per-tenant quotas for noisy neighbors; and hunt the non-obvious leaks in caches, search indexes, async jobs, ids, and logs.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["multi-tenancy", "isolation", "rls"],
          teach: {
            markdown: multiTenancyTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-multi-tenancy-apply",
            prompt:
              "Design tenant isolation for a B2B SaaS spanning small self-serve customers and large regulated enterprise customers on one platform.",
            thinkAbout: [
              "What is the silo vs pool vs bridge tradeoff?",
              "Where must tenant context be resolved and enforced?",
              "What are the non-obvious cross-tenant leakage vectors?",
            ],
            modelAnswerOutline: [
              "Assumptions: thousands of small self-serve teams (a few users each, cost-sensitive) plus a few hundred large enterprises, some regulated (HIPAA, SOC 2, data residency). Postgres primary store, Redis cache, an OpenSearch index, and async workers for exports and notifications.",
              "**Isolation strategy: tiered.** I pool the SMB tenants into a shared Postgres cluster with a `tenant_id` column on every row, because siloing thousands of tiny tenants is economically absurd. I silo the regulated enterprises into dedicated databases (and, for data-residency customers, region-specific databases), giving them the 'your data lives alone' compliance story and a small blast radius. One codebase with a tenant-to-datasource routing layer. The bridge (schema-per-tenant) I avoid as the default because it does not scale past a few thousand schemas at migration time.",
              "**Tenant context.** Resolved on **every request before business logic**, from the JWT claim or the subdomain, never from a client-supplied body field. It sets the Postgres session var `app.tenant_id` and is propagated into cache keys, search filters, job payloads, and log fields.",
              "**Data-layer enforcement.** For the pooled tenants I turn on **Postgres Row-Level Security**: a policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)` on every table, so the database refuses cross-tenant rows even if a query forgets the filter. Siloed tenants get physical isolation plus per-tenant encryption keys, so a stolen snapshot of one is useless and crypto-shredding one tenant is a key delete.",
              "**Non-obvious leaks I close:** every Redis key is prefixed with `tenant_id`; OpenSearch queries carry a mandatory tenant filter (large tenants get their own index); every async job carries `tenant_id` and re-establishes the session var on pickup so RLS applies; ids are UUIDs not sequential; logs are scrubbed and tenant-scoped before hitting the shared pipeline.",
              "**Noisy neighbor.** Per-tenant rate limits and quotas (API QPS, background-job concurrency, storage) so one tenant's batch import cannot starve the pool. Common wrong turn: getting the primary DB path perfect and forgetting the shared cache and search index, which is exactly where multi-tenant breaches actually happen, or resolving tenant from a request field the client can forge.",
            ],
          },
          practice: {
            id: "sd-l8-multi-tenancy-practice",
            prompt:
              "Design the multi-tenant data isolation for a Slack-scale workspace platform: millions of workspaces from 3-person startups to 250,000-seat enterprises, with enterprise customers demanding data residency (EU/US), their own encryption keys (BYOK), and a hard audit guarantee that no other workspace's data is ever co-mingled in a way they can access.",
            thinkAbout: [
              "How does sharding by workspace double as an isolation strategy?",
              "Why must tenant/region context be resolved before any I/O?",
              "How does BYOK turn the isolation guarantee into a cryptographic fact?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of workspaces on a huge size skew, messages/files/search all per-workspace, some enterprises require EU-only residency, BYOK (customer-managed keys), and contractual isolation guarantees.",
              "**Sharding as isolation.** At Slack scale, pooling still uses `workspace_id` (the tenant) on every row, but I shard the datastore *by workspace*, so a workspace's data lives on a specific shard (Vitess/MySQL or sharded Postgres). Small workspaces share a shard (pool); the largest 250k-seat enterprises get dedicated shards or clusters (silo), sized to their traffic and giving them an isolated blast radius. Tenant context (`workspace_id`) is resolved from the authenticated session on every request and routes to the right shard.",
              "**Data residency.** Residency is a routing dimension: EU workspaces are provisioned onto EU-region shards, caches, and search clusters, and the tenant-to-datasource map is region-pinned so no request or async job crosses the boundary. This is why tenant context must be established before any I/O.",
              "**BYOK / crypto isolation.** Each enterprise workspace has its own DEK wrapped by a customer-controlled KEK in their KMS (envelope encryption). Data is encrypted per-workspace, so co-mingled storage is still cryptographically isolated, and a customer revoking their key crypto-shreds only their data. This turns the 'never co-mingled in an accessible way' guarantee into a cryptographic fact, not just a `WHERE` clause.",
              "**Enforcement and leaks.** RLS or shard-routing on the DB path; per-workspace prefixes on every cache key; per-workspace search indexes (or a mandatory workspace filter) so a search never spans workspaces; async jobs carry `workspace_id` and region; per-workspace rate limits for noisy neighbors.",
              "Common wrong turn: treating residency and BYOK as add-ons bolted onto a single global pool. If tenant/region context is not the first thing resolved and the routing/key layer is not workspace-aware end to end, an EU export job or a shared global search index quietly violates both the residency contract and the isolation guarantee.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l8-m3",
      title: "Encryption & Secrets",
      description:
        "Design transport security that authenticates every service-to-service hop with mutual TLS, choose the right granularity of encryption at rest so a stolen database snapshot reveals nothing usable, and stand up a centralized secrets platform that rotates keys without downtime and solves the 'secret zero' bootstrap with workload identity.",
      lessons: [
        {
          id: "sd-l8-encryption-transit-mtls",
          title: "Encryption in Transit & mTLS",
          summary:
            "Baseline on TLS 1.3 for forward secrecy and downgrade protection, automate cert issuance and rotation, and use mTLS with short-lived certs to give every service a verifiable identity so you never trust the network alone.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["tls", "mtls", "pki"],
          teach: {
            markdown: encryptionTransitMtlsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-encryption-transit-mtls-apply",
            prompt:
              "Design end-to-end transport security for a microservices platform including internal service-to-service calls.",
            thinkAbout: [
              "What is the TLS 1.3 baseline and cert lifecycle hygiene?",
              "How does mTLS give workload identity?",
              "Where do you terminate vs re-encrypt?",
            ],
            modelAnswerOutline: [
              "Assumptions: a public API fronting 50-plus internal microservices on Kubernetes, handling user PII, north-south traffic from browsers and mobile, plus heavy east-west service calls. I am protecting confidentiality and integrity on every hop and want each service to have a provable identity.",
              "**North-south.** Clients hit a CDN or L7 load balancer over **TLS 1.3** with a modern cipher suite (AES-256-GCM, ChaCha20-Poly1305), HSTS with preload, and OCSP stapling. Public certs come from an ACME CA (Let's Encrypt or ACM) with 90-day lifetimes and fully automated renewal, so no cert is ever rotated by hand. I terminate TLS at the edge so it can do WAF, routing, and caching, then I **re-encrypt** from the edge to the origin: the internal hop rides its own TLS connection, so plaintext never touches an untrusted segment.",
              "**East-west.** Every internal call runs over **mTLS** enforced by a service mesh (Istio or Linkerd with Envoy sidecars). The mesh CA issues short-lived certs (24 hours, auto-rotated) carrying a **SPIFFE identity** per workload. Now authorization is identity-based: a policy says `orders` may call `payments`, verified by cert, not by 'it is inside the cluster.' Defense in depth: if an attacker lands a pod, they still cannot impersonate `payments` without its cert.",
              "**Key lifecycle and PKI.** A hardware-backed root CA (in KMS/HSM) signs an intermediate that the mesh uses to mint leaf certs. I lean on **short lifetimes instead of revocation** because OCSP/CRL scale poorly and fail badly; a 24-hour cert self-heals from compromise. Forward secrecy is automatic in 1.3, and HSTS plus refusing pre-1.2 blocks downgrade attacks.",
              "**Tradeoff I commit to:** mTLS everywhere adds handshake CPU and sidecar latency (roughly 1-3 ms per hop) and real operational complexity (mesh, CA, rotation). I accept it because the alternative, trusting the flat internal network, means one compromised host reads all east-west traffic.",
              "Common wrong turn: encrypting only north-south traffic and leaving internal service calls in plaintext because 'it is behind the firewall.' That is exactly the lateral-movement path attackers use after an initial foothold.",
            ],
          },
          practice: {
            id: "sd-l8-encryption-transit-mtls-practice",
            prompt:
              "Design transport security for a bank's payment-processing platform that must pass PCI-DSS, spans two regions, and calls a third-party card network over the public internet. Explain how you would achieve mTLS at 200k internal RPS without the handshake cost becoming a bottleneck, and how you handle the external partner whose CA you do not control.",
            thinkAbout: [
              "How do pooled long-lived connections amortize the handshake cost at 200k RPS?",
              "How do two regions share trust via a common hardware-backed root?",
              "How do you handle an external partner whose CA you do not control?",
            ],
            modelAnswerOutline: [
              "Assumptions: PCI-DSS scope, two regions, and one external card-network dependency over the public internet. At 200k internal RPS the danger is TLS handshake CPU, so the design goal is to amortize handshakes.",
              "**Amortize handshakes.** Sidecars (Envoy) maintain **long-lived, pooled mTLS connections** between services and multiplex requests over HTTP/2, so the expensive asymmetric handshake happens per connection, not per request; steady-state traffic is cheap symmetric AES-GCM with AES-NI hardware acceleration. TLS 1.3 session resumption (and 0-RTT used carefully, since it is replay-prone and should be off for payment mutations) further cut handshake cost. The mesh CA issues short-lived SPIFFE certs and rotates them out of band, so rotation never stalls request flow.",
              "**PCI-DSS specifics:** cardholder data must be encrypted in transit over open networks with strong crypto, so TLS 1.2 is the floor and 1.3 the target, weak ciphers and protocols disabled and scanned quarterly. All internal segments carrying cardholder data use mTLS, which also supports PCI's network-segmentation and least-privilege requirements by making trust identity-based.",
              "**Two regions:** each region runs its own intermediate CA under a shared hardware-backed root, and cross-region calls use mTLS with certs both sides trust via the common root. Traffic between regions rides an encrypted backbone or a re-encrypted TLS tunnel, never plaintext across the WAN.",
              "**External card network:** I do not control the partner's CA, so I use standard server TLS to their published endpoint and **pin to their CA or a backup public key** rather than a single leaf, to survive their rotations. If the partner supports mTLS, I present a client cert from a CA they explicitly whitelist, exchanged out of band. All partner traffic egresses through a dedicated, monitored proxy so the connection is auditable, and I keep a documented rotation runbook because a silent partner cert change is a classic outage.",
              "The committed tradeoff: connection pooling and hardware crypto buy scale, but they mean a leaked long-lived session key exposes more traffic, which is why forward secrecy and short cert lifetimes stay non-negotiable. Common wrong turn: per-request handshakes (no pooling) that melt CPU at 200k RPS, or pinning a single partner leaf that breaks the moment they rotate.",
            ],
          },
        },
        {
          id: "sd-l8-encryption-rest-field",
          title: "Encryption at Rest, Field-Level & E2E",
          summary:
            "Use envelope encryption with per-tenant/per-user DEKs wrapped by an HSM-held KEK, pick granularity (disk, TDE, field, E2E) by how much breach exposure and searchability you can trade, and design keys so crypto-shredding gives you instant, backup-proof erasure.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["encryption", "envelope", "crypto-shredding"],
          teach: {
            markdown: encryptionRestFieldTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-encryption-rest-field-apply",
            prompt:
              "Design encryption for a health/finance app storing PII so a stolen DB snapshot or backup reveals nothing usable.",
            thinkAbout: [
              "How does envelope encryption (DEK/KEK) work?",
              "What is the searchability tradeoff across disk vs field vs client-side encryption?",
              "How does crypto-shredding support GDPR erasure?",
            ],
            modelAnswerOutline: [
              "Assumptions: an app holding health records and financial PII (names, SSNs, diagnoses, account numbers) under HIPAA and GDPR. Threat model: a stolen DB snapshot, a leaked backup, or a rogue DBA. I want those artifacts to decrypt to nothing, while keeping the app usable.",
              "**Foundation: envelope encryption.** A cloud KMS or HSM holds the **KEK**, which never leaves the hardware boundary. Each tenant (and for the most sensitive users, each user) gets a **DEK** that encrypts their data with **AES-256-GCM**; the DEK is stored wrapped by the KEK next to the ciphertext. A stolen snapshot contains ciphertext plus wrapped DEKs but no KEK, so it is useless. Rotation is cheap: rotate the KEK by re-wrapping DEKs, no data rewrite.",
              "**Granularity, chosen per field.** I do not stop at full-disk or TDE, because those are transparent and a compromised app or DBA reads plaintext. For the crown jewels (SSN, card number, diagnosis) I use **application field-level encryption**: the app encrypts before writing, so the DB only ever stores ciphertext, defeating both the stolen snapshot and the rogue DBA. Card data specifically I would **tokenize** to keep it out of my systems and shrink PCI scope. Non-sensitive columns stay plaintext for querying. I keep TDE/full-disk on underneath anyway as a cheap outer layer for backups and physical theft.",
              "**Searchability.** Randomized AES-GCM kills search, so where I must look users up (say by email) I use **deterministic encryption or a keyed blind index** on that one field, accepting that it leaks equality, and keep everything else randomized. I explicitly do not make diagnosis or SSN searchable.",
              "**Erasure via crypto-shredding.** Because each user has a DEK, GDPR 'right to be forgotten' is executed by **deleting that user's DEK**. Their data instantly becomes unrecoverable everywhere, including replicas, WAL, and backups I cannot hard-delete. I also encrypt **backups and application logs** and scrub PII from logs, since those are the copies teams forget.",
              "Tradeoff: field-level encryption and per-user keys add app complexity, key-management overhead, and lost query flexibility. I accept it because HIPAA/GDPR exposure from a plaintext breach is catastrophic. Common wrong turn: claiming 'encrypted at rest' while the key sits in the same database or config next to the data, so a snapshot that grabs the data grabs the key too. The KEK must live in a separate HSM/KMS trust boundary.",
            ],
          },
          practice: {
            id: "sd-l8-encryption-rest-field-practice",
            prompt:
              "Design the encryption architecture for a password manager like 1Password serving 100M vault items, where the company must never be able to read a customer's passwords even under subpoena, yet users must sync across devices, recover a lost password, and search their vault. Explain the key hierarchy and where each operation happens.",
            thinkAbout: [
              "Why does true E2EE mean all crypto happens client-side?",
              "How do the master password plus a device Secret Key root the key hierarchy?",
              "Why is server-side recovery impossible, and what replaces it?",
            ],
            modelAnswerOutline: [
              "Assumptions: the hard constraint is **true E2EE**: the server stores only ciphertext it cannot decrypt, so a subpoena or a full server breach yields nothing. All encryption and decryption happen **client-side**.",
              "**Key hierarchy.** The user's **master password** never leaves the device and is never sent to the server. Combined with a high-entropy **Secret Key** stored on the device (1Password's actual design), it is stretched via a slow KDF (PBKDF2/Argon2, hundreds of thousands of iterations) into a key that unwraps the user's **private key**. Each vault has a symmetric **vault key**; individual items are encrypted with per-item keys wrapped by the vault key (envelope encryption again, rooted in the user, not a server HSM). The server stores wrapped keys and ciphertext blobs only.",
              "**Sync across devices.** Because the master password plus Secret Key regenerate the unwrapping key, any device that has both can pull the encrypted blobs and decrypt locally. New-device setup transfers the Secret Key out of band (QR/secret) so the server never holds it.",
              "**Recovery.** This is the honest tradeoff of E2EE: if the server cannot read your data, it cannot reset a forgotten master password. So recovery is not server-side reset but mechanisms like a printed Emergency Kit, or for teams a **recovery keypair** held by an admin whose public key also wraps the vault key, so an admin can re-grant access without the server ever seeing plaintext.",
              "**Search.** The server cannot search ciphertext, so search happens **on the client** after the vault is decrypted locally into memory, or via a client-built encrypted index. This is acceptable because a personal vault is small enough to decrypt and search on-device.",
              "The committed tradeoff: E2EE gives the strongest possible confidentiality and a clean legal story (we cannot comply with a plaintext demand because we have no plaintext), at the cost of no server-side recovery, no server-side search or processing, and real key-distribution complexity. Common wrong turn: holding a server-side 'master key' for convenience, which quietly destroys the entire E2EE guarantee.",
            ],
          },
        },
        {
          id: "sd-l8-secrets-kms",
          title: "Secrets & Key Management (KMS/HSM, Rotation)",
          summary:
            "Put secrets in a dedicated store rooted in an HSM-backed KMS, rotate with versioned dual-secret windows so there is no downtime, solve secret zero with platform-issued workload identity that hands out short-lived dynamic secrets, and log every access under least-privilege policies.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["secrets", "kms", "workload-identity"],
          teach: {
            markdown: secretsKmsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-secrets-kms-apply",
            prompt:
              "Design a centralized secrets platform for 500 microservices consuming 10k secrets with rotation and per-access audit.",
            thinkAbout: [
              "Why a dedicated secret store over env vars/config files?",
              "How does workload identity solve the secret-zero problem?",
              "How do you rotate without downtime?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500 microservices on Kubernetes, roughly 10k secrets (DB creds, API keys, TLS keys, signing keys), multi-team, under SOC 2 / compliance that demands per-access audit and rotation.",
              "**Store.** I run **HashiCorp Vault** (or the cloud-managed equivalent) as the single secret store, rooted in an **HSM-backed KMS** that holds the master/unseal key, so the root of trust is FIPS-validated hardware. No secret ever lives in env vars, config files, or git; those leak through history, CI logs, and images and cannot be rotated or audited.",
              "**Secret zero via workload identity.** Each pod authenticates to Vault using a **platform-issued identity**, not a pre-placed token: the Kubernetes ServiceAccount JWT (or SPIFFE/SPIRE SVID), which Vault verifies against the cluster's OIDC issuer. No bootstrap secret sits on any box, which is what makes 500 services tractable. Vault maps that identity to a **least-privilege policy** scoping the workload to only its secrets.",
              "**Dynamic, short-lived secrets.** Wherever possible I issue **dynamic secrets**: Vault generates a unique DB credential per pod with a 1-hour TTL and auto-revokes it. Leaks are self-limiting and every credential traces to one workload. Static third-party keys that cannot be dynamic get scheduled rotation.",
              "**Rotation without downtime.** Versioned secrets with a **dual-secret overlap window**: create version N+1 while N still works, roll consumers (they re-fetch on a lease/TTL refresh, or via a sidecar like Vault Agent), verify nothing uses N, then revoke N. For signing/encryption keys, accept old-or-new during the window and re-sign/re-encrypt lazily.",
              "**Audit and hygiene.** Every read is logged (identity, secret, timestamp) to an append-only audit log for SOC 2 and blast-radius analysis. I add **leaked-credential scanning** (pre-commit + GitHub secret scanning) with auto-revoke on hit. I run Vault HA with sidecar caching so a Vault hiccup does not take down 500 services. Common wrong turn: long-lived static credentials handed out once and never rotated, or a bootstrap token in an env file, which quietly rebuilds the exact problem the platform was meant to remove.",
            ],
          },
          practice: {
            id: "sd-l8-secrets-kms-practice",
            prompt:
              "Design secrets and key management for a fintech that signs 50M payment transactions per day with private signing keys that must be FIPS 140-2 Level 3 protected, operates in 3 regions, and needs an emergency key-compromise response that revokes and rotates a root signing key without halting payments. Explain the key hierarchy and the compromise runbook.",
            thinkAbout: [
              "Why must the signing key never leave the HSM, and how do you get throughput?",
              "Why keep the root cold and sign with short-lived intermediates?",
              "How does a dual-key overlap window rotate a root without halting payments?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50M signatures/day, signing keys are the crown jewels, regulation demands **FIPS 140-2 Level 3**, so the private signing keys **never exist outside an HSM**. The app does not hold the key; it calls the HSM's sign API (CloudHSM or a dedicated appliance), so a full server compromise leaks no key material.",
              "**Throughput.** At ~600 signs/sec average (higher at peak) I front the HSMs with a signing service that pools connections and batches, since HSM sign throughput is the bottleneck, and I size an HSM cluster per region for headroom.",
              "**Key hierarchy.** A **root signing key** in the HSM signs (or certifies) **intermediate signing keys**; day-to-day transaction signing uses short-lived intermediates, so the root is used rarely and stays offline/quorum-protected. Rotating an intermediate is routine, and the root almost never has to move. DEKs/KEKs for data at rest sit under the same HSM root of trust.",
              "**Three regions.** Each region has its own HSM cluster holding replicas of the intermediates (keys replicated only inside the HSM/KMS boundary via vendor-secure channels), so a regional outage does not stop signing and cross-region latency never sits in the signing path. The root is held in one hardened region under M-of-N quorum (multiple officers must approve a root operation).",
              "**Compromise runbook (rotate a root without halting payments).** 1) Detect and freeze issuance of new intermediates from the suspect root. 2) Stand up a **new root** via the quorum ceremony in the HSM. 3) Issue **fresh intermediates** from the new root and push them to regional signing services. 4) Flip signing to new intermediates using the **dual-key overlap window**, so payments keep flowing on still-valid intermediates while the switch happens, no halt. 5) Distribute the new root's public key/trust anchor to verifiers, then **revoke** the old root and its intermediates. 6) Re-verify or re-sign anything that must chain to the new root.",
              "The committed tradeoff: HSM-bound keys and quorum ceremonies add latency and operational friction and cap throughput, which is exactly why the hierarchy keeps the root cold and does high-volume signing with cheap-to-rotate intermediates. Common wrong turn: a single long-lived signing key used directly for all traffic, which turns a compromise into a full stop instead of an overlap-window rotation.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l8-m4",
      title: "Abuse & Perimeter Defense",
      description:
        "Separate L3/L4 volumetric floods from L7 application floods and choose the right control for each, design rate limiting and quotas that shed abuse without denying-of-wallet yourself, stop automated abuse (credential stuffing, fake accounts, card testing) with graduated risk-based friction instead of blunt blocks, and reason about attackers with STRIDE while redesigning a flat network into zero-trust.",
      lessons: [
        {
          id: "sd-l8-ddos-rate-abuse",
          title: "Rate Limiting, Quotas & DDoS Defense",
          summary:
            "Split defenses into L3/L4 volumetric (anycast, CDN/scrubbing, SYN cookies, BGP) and L7 application (WAF, behavioral limits, graduated challenges); rate-limit with token bucket on multiple dimensions and tiered quotas in Redis; return 429 with Retry-After; decide fail-open vs fail-closed per endpoint; and cap autoscaling so you do not denial-of-wallet yourself.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["ddos", "rate-limiting", "waf"],
          teach: {
            markdown: ddosRateAbuseTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-ddos-rate-abuse-apply",
            prompt:
              "Design DDoS protection plus abuse rate limiting for a high-traffic public API covering volumetric floods and L7 HTTP floods.",
            thinkAbout: [
              "How do L3/L4 volumetric and L7 application defenses differ?",
              "What is economic denial-of-service (denial of wallet)?",
              "What is the fail-open vs fail-closed decision for the limiter?",
            ],
            modelAnswerOutline: [
              "Assumptions: a public REST/gRPC API at ~50k QPS baseline, authenticated by API key, some anonymous read endpoints, running on autoscaling containers behind a cloud load balancer. Attackers range from a 400 Gbps UDP reflection flood to a 20k QPS L7 flood on the search endpoint.",
              "**L3/L4:** put the whole API behind an anycast CDN with DDoS protection (Cloudflare or AWS Shield Advanced + CloudFront). Anycast spreads a volumetric flood across hundreds of PoPs, and the scrubbing layer drops reflected/malformed packets and absorbs SYN floods with SYN cookies before anything reaches origin. Origin IPs are never published; only the CDN can reach them (origin firewall allowlists the CDN ranges), so attackers cannot bypass the edge.",
              "**L7:** at the edge I run a WAF with the OWASP core ruleset plus IP-reputation and ASN blocking, and I set behavioral rate limits. Rate limiting uses token bucket in Redis with atomic Lua, keyed on multiple dimensions: per API key (tiered: free 100/min, pro 10k/min), per IP for anonymous endpoints, and a tighter per-endpoint limit on the expensive search path. Over-limit returns `429` with `Retry-After` and `RateLimit-*` headers so well-behaved clients back off. Suspicious-but-not-clearly-abusive clients get a graduated challenge (managed CAPTCHA, then JS proof-of-work) rather than a hard block.",
              "**Fail behavior is per endpoint:** reads fail-open with a conservative per-instance local limit if Redis is unreachable (a limiter blip should not become an outage), but auth/write endpoints fail-closed.",
              "**Denial-of-wallet:** I cap the autoscaler's max instances and rely on the CDN cache to serve reads so a flood hits cheap edge capacity, not my origin or my invoice, plus billing alarms.",
              "Common wrong turn: treating this as one problem and buying only a WAF. A WAF does nothing against a 400 Gbps L3 flood, and anycast scrubbing does nothing against 20k QPS of valid-looking HTTP. You need both layers.",
            ],
          },
          practice: {
            id: "sd-l8-ddos-rate-abuse-practice",
            prompt:
              "Design abuse defense for a serverless GraphQL API (AWS Lambda + API Gateway) powering a startup's mobile app at 5k QPS, where a single crafted GraphQL query can fan out into hundreds of resolver calls and every invocation costs money. Lead with how you stop query-cost abuse and denial-of-wallet on a pay-per-invocation stack.",
            thinkAbout: [
              "Why does a plain QPS limit fail to stop GraphQL cost abuse?",
              "How do query depth/complexity limits and persisted queries close the surface?",
              "What serverless-specific controls cap the denial-of-wallet risk?",
            ],
            modelAnswerOutline: [
              "Assumptions: unauthenticated clients can hit a few queries (config, product listing); most operations require a signed-in token. The business risk is not 'site down,' it is a runaway AWS bill, because Lambda charges per invocation and per GB-second and GraphQL lets a client request deeply nested, expensive graphs.",
              "**Query-cost limiting (GraphQL-specific, the heart of the answer).** I enforce a **maximum query depth** and **query complexity budget**: each field has a cost weight, the server sums the requested query's cost before executing, and rejects anything over the budget with a `400`. I disable introspection in production and use **persisted queries** (allowlist of hashed, pre-approved operations) so clients cannot send arbitrary expensive graphs at all; anything not on the allowlist is rejected. This turns an open attack surface into a closed one.",
              "**Denial-of-wallet controls on the serverless stack.** I set a Lambda **reserved/maximum concurrency** so a flood cannot scale invocations (and the bill) without bound; excess requests get throttled at API Gateway rather than executed. API Gateway usage plans give per-API-key rate and burst limits and monthly quotas. I add a CloudFront + WAF layer in front for L3/L4 absorption and IP reputation, and put AWS Budgets alarms on invocation count and spend so a novel attack pages a human early.",
              "**Standard abuse limits:** token-bucket rate limits per user and per IP in DynamoDB or ElastiCache, tiered by plan, with `429`/`Retry-After`. Anonymous endpoints get the tightest limits since they lack an identity to attribute abuse to.",
              "**Fail behavior:** I fail-closed on the concurrency cap (better to shed load with 429s than to autoscale into a five-figure bill), and fail-open only on non-cost-bearing cached reads.",
              "Common wrong turn: applying only a request-per-second limit. At GraphQL, one allowed request can still cost 100x a normal one, so without depth/complexity limits and persisted queries the QPS limit does nothing to stop cost abuse.",
            ],
          },
        },
        {
          id: "sd-l8-bot-fraud-ato",
          title: "Bot Defense, Fraud & Account-Takeover Prevention",
          summary:
            "Layer breached-password checks, MFA, and velocity/impossible-travel against credential stuffing and ATO; use fingerprinting, behavioral signals, and invisible challenges for bots; raise cost and lower value against Sybil/fake accounts; score every event with features+rules+ML and respond with graduated, auditable, reversible step-up friction instead of blunt blocks.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["fraud", "bot-defense", "ato"],
          teach: {
            markdown: botFraudAtoTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-bot-fraud-ato-apply",
            prompt:
              "Design abuse defense for a signup/login and checkout flow facing credential stuffing, fake accounts, and card testing.",
            thinkAbout: [
              "What signals detect credential stuffing and impossible travel?",
              "How do you balance friction against conversion with graduated response?",
              "How do you defend against Sybil/fake accounts?",
            ],
            modelAnswerOutline: [
              "Assumptions: a consumer e-commerce app, ~1M users, email+password login with optional social, guest and account checkout. Three threats: credential stuffing/ATO on login, fake accounts farming a signup promo, and card testing on checkout.",
              "**Risk-scoring pipeline.** I run every sensitive event (signup, login, checkout) through a pipeline: extract features (IP reputation, device fingerprint, velocity counters, breached-password result, behavioral timings), apply deterministic rules for known-bad patterns, and a gradient-boosted model for the fuzzy middle, producing a 0 to 1 risk score.",
              "**Login / ATO:** reject known-breached passwords at auth and force reset. Enforce MFA, and require WebAuthn/passkeys for high-value accounts. Velocity counters per account and per IP detect stuffing (many accounts hit from one IP, or many IPs hitting one account); impossible-travel (geo distance / time between logins exceeding physical possibility) forces step-up. On medium risk, step-up with an MFA or email challenge rather than blocking.",
              "**Fake accounts / Sybil:** require verified email plus phone verification for promo eligibility, reject disposable-email and VOIP ranges, and cap accounts per device and per payment instrument per day. New accounts get limited privileges (reputation/aging) so a freshly minted account cannot immediately drain the promo.",
              "**Card testing:** velocity limits per card, per BIN, and per device; trigger 3-D Secure step-up on risk; and alarm on the signature pattern (many small auths, high decline rate) to auto-tighten.",
              "The governing principle is graduated response tuned on **fraud caught per unit of legitimate friction**: silent for the clean majority, challenge the ambiguous, hard-block only high-confidence abuse. Every block is logged, auditable, and reversible, and confirmed outcomes feed back to retrain. Common wrong turn: a blanket CAPTCHA or hard block on any suspicious login. It tanks conversion, floods support with locked-out real users, and still fails against modern CAPTCHA-solving bots.",
            ],
          },
          practice: {
            id: "sd-l8-bot-fraud-ato-practice",
            prompt:
              "Design bot and fraud defense for a concert-ticket platform (think Ticketmaster on an on-sale) where scalper bots try to buy the entire inventory in the first 90 seconds using thousands of residential-proxy IPs and pre-created verified accounts. Lead with how you keep inventory reaching real fans without a hard CAPTCHA wall that collapses under the on-sale spike.",
            thinkAbout: [
              "Why does a virtual waiting room neutralize the 'fastest bot wins' race?",
              "Why lean on device/behavioral signals when IP reputation is weak?",
              "How do purchase-side limits and account-linkage beat pre-created accounts?",
            ],
            modelAnswerOutline: [
              "Assumptions: a hyped on-sale, 20k tickets, hundreds of thousands of real fans plus scalper botnets arriving in the same 90-second window. The adversary is well-funded: rotating residential proxies (so IP reputation is weak), aged accounts with verified phone/email (so signup friction already happened), and headless-browser automation.",
              "**Virtual waiting room (the core move).** All users are admitted to a queue at the edge (Queue-it style or homegrown) before they can reach the buy flow, and released at a controlled rate. This flattens the 90-second spike into manageable throughput, removes the 'fastest bot wins' race, and gives me time to score each session. Queue position is issued as a signed token so it cannot be forged or parallelized.",
              "**Device and behavioral signals** (because IP reputation is weak): TLS/JA3 fingerprints, headless-browser detection, and behavioral biometrics (real humans move a mouse and hesitate; bots do not). Sessions get a risk score; high-risk sessions are throttled or shadow-queued rather than hard-blocked (a hard block tells the attacker exactly what tripped and invites tuning).",
              "**Purchase-side limits** against pre-created accounts: strict tickets-per-account, per-payment-instrument, and per-device caps, plus linking accounts that share a device fingerprint or payment method so one operator's 500 accounts count as one entity. Payment-instrument velocity catches the same card funding many 'different' accounts.",
              "**Graduated friction:** defer the hard CAPTCHA to only the highest-risk sessions, because a blanket CAPTCHA at on-sale peak both frustrates fans and is solvable by paid solver services anyway. Post-purchase, run asynchronous fraud review and cancel/reclaim orders that later score as bot-bought, a reversible auditable backstop that does not add real-time friction.",
              "Common wrong turn: treating this as pure rate limiting by IP. Residential proxies defeat IP limits, so identity-, device-, and payment-linkage plus a waiting room are what actually protect inventory.",
            ],
          },
        },
        {
          id: "sd-l8-threat-modeling-zerotrust",
          title: "Threat Modeling & Zero-Trust Architecture",
          summary:
            "STRIDE walks a data-flow diagram's trust boundaries to surface spoofing/tampering/repudiation/info-disclosure/DoS/elevation threats, each mapping to a defense; apply least privilege, defense in depth, fail secure, complete mediation, secure defaults, and assume-breach; and implement zero-trust with workload identity, mTLS via a service mesh, identity-aware proxies replacing VPNs, and micro-segmentation.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["threat-modeling", "zero-trust", "stride"],
          teach: {
            markdown: threatModelingZerotrustTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-threat-modeling-zerotrust-apply",
            prompt:
              "Produce a threat model for a payments feature using STRIDE, then redesign a flat internal network into a zero-trust model for microservices.",
            thinkAbout: [
              "What does STRIDE enumerate, and what are the core secure-design principles?",
              "What does 'never trust, always verify' change about internal traffic?",
              "How do you limit lateral movement and blast radius?",
            ],
            modelAnswerOutline: [
              "Assumptions: a `CheckoutService` takes a payment request from a browser, calls a `PaymentService` that talks to a third-party processor (Stripe), and writes an order to a database. Today all internal services sit on one flat VPC subnet behind a VPN; any service can reach any other.",
              "**STRIDE over the payment data flow.** Trust boundaries: browser to Checkout, Checkout to Payment, Payment to Stripe, services to database. Spoofing: a caller impersonates a user or service -> strong user auth (session + MFA for high value) and workload identity + mTLS between services. Tampering: amount or recipient altered or a request replayed -> TLS everywhere, server-side price recomputation (never trust client-sent totals), idempotency keys. Repudiation: a user denies a charge -> tamper-evident audit log. Information disclosure: card data leaks -> never touch raw PANs, tokenize via Stripe, encrypt PII at rest. DoS: checkout flooded -> rate limits and quotas. Elevation: a low-privilege service reaches payment internals -> least privilege and authorization checks on every call.",
              "**Zero-trust redesign.** Remove implicit network trust. Give every service a SPIFFE identity issued by SPIRE (or cloud IAM), and put all traffic through a service mesh (Istio) enforcing mTLS, so PaymentService only accepts calls that cryptographically prove they came from CheckoutService. Apply micro-segmentation with default-deny network policy: CheckoutService may reach PaymentService and the order DB, nothing else; PaymentService may reach Stripe and its own DB, nothing else.",
              "**Human access and mediation.** Replace the VPN for human/admin access with an identity-aware proxy (BeyondCorp / IAP) that verifies user and device per request. Enforce complete mediation: authorization is checked on every request, not once at login.",
              "**Blast radius:** if CheckoutService is compromised, its identity is scoped, it can reach only Payment and its DB, mTLS stops it impersonating anything else, and every attempt is logged, so lateral movement is contained and visible.",
              "Common wrong turn: treating 'we have a VPN and a firewall' as security. Once inside, a flat network lets one compromised pod roam freely; zero-trust removes that implicit interior trust.",
            ],
          },
          practice: {
            id: "sd-l8-threat-modeling-zerotrust-practice",
            prompt:
              "Explain how you would run a threat-modeling exercise and a zero-trust rollout for a 200-service platform migrating off a flat corporate network (think a bank moving from perimeter VPN to BeyondCorp) without a big-bang cutover. Lead with how you sequence the migration so nothing breaks and you get blast-radius reduction early.",
            thinkAbout: [
              "Why scope threat modeling to the highest-risk services first?",
              "Why is permissive-then-strict mTLS the survivable path?",
              "Why does enforcing strict mTLS before mapping the call graph break things?",
            ],
            modelAnswerOutline: [
              "Assumptions: ~200 microservices, thousands of employees, a flat network reachable via corporate VPN, strict audit and uptime requirements. A big-bang 'turn on mTLS everywhere Monday' is a guaranteed outage, so I sequence it.",
              "**Threat modeling first, but scoped.** I do not threat-model all 200 services at once. I rank services by data sensitivity and exposure (payments, PII stores, auth, internet-facing edges), run STRIDE data-flow sessions on the top tier, and feed findings into the migration order so the highest-risk trust boundaries get zero-trust protection first. Threat modeling becomes a required step in the design-review template for all new services, so the problem stops growing.",
              "**Phase 1: establish workload identity.** Deploy SPIRE (or adopt cloud IAM identities) and issue every service an identity, with no enforcement yet. **Phase 2: mesh in permissive mode.** Deploy the service mesh (Istio/Linkerd) with mTLS in **permissive mode**, where it accepts both plaintext and mTLS and reports which calls are already mutually authenticated. This surfaces the real call graph without breaking anything.",
              "**Phase 3: strict cutover service by service.** Flip destinations to **strict mTLS** once their inbound callers are all authenticated, and layer in authorization policies (which identities may call which endpoints). **Phase 4: micro-segmentation** the same incremental way, using the observed call graph to write least-privilege default-deny policies. **Phase 5:** replace VPN access to internal apps with an identity-aware proxy (BeyondCorp/IAP) that checks user and device posture per request, retiring the VPN once coverage is complete.",
              "I get blast-radius reduction early because the highest-risk services move first, and permissive-then-strict means every step is observable and reversible.",
              "Common wrong turn: enforcing strict mTLS globally before mapping the actual call graph. You will break undocumented dependencies and trigger a rollback that discredits the whole initiative. Permissive mode plus incremental strict cutover is what makes a 200-service migration survivable.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l8-m5",
      title: "Privacy, Compliance & Audit",
      description:
        "Translate regulations (GDPR, SOC 2, HIPAA, PCI-DSS) into concrete architecture instead of legalese, build a data platform that can actually find and erase every copy of one user's PII, design tamper-evident audit trails and a secure build pipeline with no long-lived secrets, and run a breach response for a compromised key without either losing forensic evidence or logging every user out.",
      lessons: [
        {
          id: "sd-l8-compliance-frameworks",
          title: "Compliance Frameworks & Regulatory Design",
          summary:
            "Build the shared baseline (encryption, access control, logging, backups) once, layer framework-specific non-negotiables on top, treat data residency as a regional-sharding driver rather than a checkbox, and use tokenization to pull whole systems out of PCI/PHI scope.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["compliance", "gdpr", "pci"],
          teach: {
            markdown: complianceFrameworksTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-compliance-frameworks-apply",
            prompt:
              "Design a system handling EU health and payment data to satisfy overlapping GDPR, SOC 2, PCI-DSS, and HIPAA controls, and show which controls you build once versus per-framework.",
            thinkAbout: [
              "What baseline controls do the frameworks share?",
              "How does data residency drive architecture?",
              "How does tokenization reduce PCI scope?",
            ],
            modelAnswerOutline: [
              "Assumptions: a telehealth product taking EU patients, storing health records (HIPAA-style PHI plus GDPR special-category data) and taking card payments (PCI-DSS), sold to enterprises who demand a SOC 2 Type II report. Strategy: build one control baseline, then bolt on framework-specific pieces, and aggressively reduce scope so fewer systems face audit.",
              "**Shared baseline (built once):** TLS 1.2+ everywhere, AES-256 at rest with keys in a managed KMS (envelope encryption, per-tenant data keys), RBAC plus ABAC with mandatory MFA and least privilege, centralized immutable logging, tested encrypted backups with a documented RTO/RPO, and change management through pull requests and ticketed approvals. This single stack satisfies most of GDPR Art. 32, HIPAA safeguards, PCI encryption/access requirements, and SOC 2 security criteria at once.",
              "**Data residency (the architectural driver):** shard by region. EU patient PHI is stored and processed only in eu-central-1, with region-pinned databases, region-local backups, and CDN/log sinks that never leave the EU. Any transfer to a US analytics team rides on SCCs plus the Data Privacy Framework, and the pipeline is built so residency holds by construction, not by policy memo.",
              "**Scope reduction via tokenization:** I never store the PAN. The browser sends the card straight to Stripe (a PCI Level 1 provider), which returns a token my systems persist. This drops nearly all of my services out of PCI scope, leaving only the thin payment-initiation path to assess. Similarly I minimize PHI: store what treatment requires, nothing more.",
              "**Framework-specific additions:** sign a BAA with every subprocessor touching PHI (hosting, email, monitoring), stand up DSAR and erasure workflows for GDPR rights, run a DPIA before launch, and instrument the controls to produce SOC 2 evidence (access reviews quarterly, change logs, uptime and incident records) over a 6 to 12 month observation window.",
              "Common wrong turn: treating residency as a checkbox. Using a globally-replicated table or a US-terminating CDN silently exports EU data and breaks GDPR no matter what the privacy policy says.",
            ],
          },
          practice: {
            id: "sd-l8-compliance-frameworks-practice",
            prompt:
              "Design the compliance architecture for a US fintech (a Chime-style neobank) expanding into Germany, handling both cardholder data and bank-account data for 5 million EU users, and explain how you re-architect a single global platform into a residency-compliant one.",
            thinkAbout: [
              "How do you split a global monolith into region cells for residency?",
              "How do you get analytics value without exporting EU personal data?",
              "Why is a Frankfurt read replica not 'EU residency'?",
            ],
            modelAnswerOutline: [
              "Assumptions: the existing platform is a single US-region monolith on AWS us-east-1 with a global Aurora database and a shared analytics lake. EU launch triggers GDPR, PSD2/SCA for payments, and continued PCI-DSS. The hard problem is residency, not throughput.",
              "**Re-architecture into region cells.** Stand up an eu-central-1 cell with its own Aurora cluster, its own KMS keys, and its own object storage, and route EU users to it via geo-aware DNS and an identity home-region attribute. EU personal and account data is written only in the EU cell. The US cell stays authoritative for US users. This is 'regional sharding' from residency made real: no global table spanning both.",
              "**Payments:** keep tokenizing cards through a PCI provider so PAN never lands in either cell, and add PSD2 Strong Customer Authentication (SCA) at the EU payment flow via 3-D Secure.",
              "**Analytics without leaking residency:** rather than shipping raw EU rows to the US lake, pseudonymize and aggregate inside the EU, then export only de-identified aggregates under SCCs. Cross-region control-plane traffic (deploys, config) is fine; cross-region personal data is not.",
              "**Controls and evidence:** replicate the shared baseline (encryption, RBAC/MFA, logging) into the EU cell, appoint an EU representative and run a DPIA, and stand up local DSAR/erasure so an EU regulator sees a compliant, self-contained processor.",
              "Common wrong turn: bolting a read replica of the global DB into Frankfurt and calling it 'EU residency.' The write path and backups still live in the US, so EU data is still exported. Residency means the authoritative copy and its backups stay in-region.",
            ],
          },
        },
        {
          id: "sd-l8-pii-dsar-privacy",
          title: "PII Governance, DSAR/Erasure & Privacy Engineering",
          summary:
            "Catalog every copy first, orchestrate rights on a stable user_id, delete across all live stores plus third parties, crypto-shred to handle backups, resolve retention conflicts per-field, and pick anonymization vs pseudonymization deliberately with k-anonymity or differential privacy for shared analytics.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["pii", "dsar", "privacy-engineering"],
          teach: {
            markdown: piiDsarPrivacyTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l8-pii-dsar-privacy-apply",
            prompt:
              "Design a data platform that can find and delete every copy of one user's PII within 30 days across all stores, and can share analytics data while minimizing re-identification risk.",
            thinkAbout: [
              "How do you locate every copy of a user's PII?",
              "How does crypto-shredding handle erasure across backups?",
              "How do anonymization, pseudonymization, and tokenization differ?",
            ],
            modelAnswerOutline: [
              "Assumptions: a consumer app under GDPR with PII spread across Postgres (primary + replicas), Redis, OpenSearch, an S3/Parquet lake feeding analytics, Kafka, application logs, and third parties (Stripe, Segment, SendGrid). Legal deadline is 30 days.",
              "**Find it first:** a data catalog tags every field's sensitivity and records its home store. Classification is enforced at write time so no PII column is uncatalogued. This inventory makes 'delete the user' deterministic rather than a hunt.",
              "**Rights orchestration:** a DSAR/erasure service keyed on `user_id` writes a request record, then fans out jobs to every registered store and tracks per-store completion against the 30-day clock, producing an auditable trail.",
              "**Erasure across stores:** direct DELETE in Postgres and replicas, key eviction in Redis, delete-by-query in OpenSearch, tombstone-plus-compaction to physically rewrite Parquet files in the lake, and deletion-API calls to Stripe/Segment/SendGrid with stored receipts. Logs get short retention and PII-scrubbing at ingest so old logs age out.",
              "**Backups via crypto-shredding:** each user's data is encrypted with a per-user data key in KMS. Erasure destroys that key, so the ciphertext frozen in immutable backups becomes unrecoverable. I keep backups immutable (ransomware defense) and still achieve effective erasure, the pattern regulators accept. Retention conflicts are per-field: I erase profile and marketing data but retain legally-required financial records (pseudonymized) with a documented lawful basis.",
              "**Safe analytics sharing:** I never share raw PII. For internal analytics I pseudonymize (reversible token, key held separately). For external or broad sharing I anonymize and enforce k-anonymity so no group is a single person, or apply differential privacy (noise injection) so one individual's presence never shifts a result. Common wrong turn: claiming GDPR erasure while ignoring backups, caches, search, and third-party processors, leaving the user fully recoverable from a replica, a search index, or a vendor.",
            ],
          },
          practice: {
            id: "sd-l8-pii-dsar-privacy-practice",
            prompt:
              "Design the 'delete my account' pipeline for a Spotify-scale platform (500M+ users, PII in Cassandra, Kafka, a petabyte-scale data lake, ML feature stores, and dozens of third-party ad and analytics vendors), meeting a 30-day SLA at that scale.",
            thinkAbout: [
              "Why is event-driven per-owner erasure better than a synchronous orchestrator at this scale?",
              "How do you erase from a petabyte lake without rewriting it per request?",
              "Why do Cassandra tombstones and gc_grace_seconds matter for real deletion?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500M users, high erasure request volume, PII replicated across Cassandra (multi-region), Kafka event streams, a petabyte S3 lake, an ML feature store, and 30+ vendors. Scale makes both discovery and lake rewriting the hard parts.",
              "**Event-driven fan-out.** An erasure request publishes a `UserDeletionRequested(user_id)` event to Kafka. Every data-owning system subscribes and is responsible for erasing its own copy, then emits a `DeletionCompleted(user_id, system)` ack. A central coordinator tracks acks against the 30-day SLA and escalates stragglers. This scales far better than a synchronous orchestrator calling dozens of systems.",
              "**Live stores:** Cassandra deletes emit tombstones; I must ensure `gc_grace_seconds` and repair actually purge them across regions, not just mask them. Feature store rows and cached vectors are deleted or invalidated so the ML models stop seeing the user.",
              "**Petabyte lake:** you cannot rewrite a petabyte on every request. Two moves: (1) crypto-shred, per-user keys so destroying a key neutralizes lake and backup copies instantly without a rewrite, and (2) batch physical deletion via a table format (Apache Iceberg/Hudi/Delta) that supports row-level deletes and periodic compaction, so tombstones from many users are applied in scheduled compaction rather than per-request. Crypto-shredding is what makes the 30-day SLA feasible at this scale.",
              "**Third parties:** call each vendor's deletion API (or suppression list where deletion is not offered), store the receipt, and treat a missing ack as an SLA breach to chase. Streams and backups: Kafka topics with PII get short retention plus crypto-shredding; immutable backups are handled entirely by key destruction.",
              "Common wrong turn: trying to synchronously find and rewrite every copy at request time. At 500M users and petabyte lakes that never meets the SLA. Crypto-shredding plus event-driven per-owner erasure plus batched compaction is the scalable pattern.",
            ],
          },
        },
        {
          id: "sd-l8-audit-supplychain",
          title: "Audit Logging, OWASP & Supply-Chain Security",
          summary:
            "Make audit logs separate, append-only, hash-chained and WORM-stored with actor/action/resource but no PII; defend BOLA/injection/SSRF/mass-assignment (BOLA first); and secure the supply chain with SBOM, SCA, signing, SLSA provenance, and workload identity for short-lived creds.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["audit-logging", "owasp", "supply-chain"],
          teach: {
            markdown: auditSupplychainTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l8-audit-supplychain-apply",
            prompt:
              "Design a tamper-evident audit-logging system for sensitive and admin actions, and secure the build-and-deploy pipeline and service-to-service auth with no long-lived secrets.",
            thinkAbout: [
              "What makes an audit log tamper-evident, and what do you capture?",
              "Which OWASP API risks must the gateway defend?",
              "How do SBOM, signing, and workload identity secure the supply chain?",
            ],
            modelAnswerOutline: [
              "Assumptions: a multi-service SaaS where admins can change tenant settings, export data, and impersonate users, and the pipeline builds container images in CI and deploys to Kubernetes.",
              "**Audit logging:** a dedicated audit service, separate from app logs, exposes an append-only write API. Every sensitive or admin action emits an event capturing actor identity, action, resource id, timestamp, source IP/session, and result. Entries are hash-chained (each stores the previous entry's hash) and persisted to S3 with Object Lock in compliance mode (WORM), so neither an attacker with admin nor an insider can silently rewrite history, and any tampering breaks the chain. I deliberately keep PII and secrets out of the payload (log 'exported dataset 789,' not its rows).",
              "**OWASP defenses:** the gateway does schema/input validation, rate limiting, and authentication, and all queries are parameterized. The critical control lives in the services: object-level authorization (BOLA/IDOR) on every access, verifying the caller owns the object rather than trusting an ID from the URL. I also block SSRF by allowlisting any server-side URL fetches (protecting the cloud metadata endpoint) and reject mass assignment by binding to explicit DTOs, never the raw request body.",
              "**Supply chain:** CI generates an SBOM (CycloneDX) for every build and runs SCA scanning to fail the build on known-vulnerable dependencies. Images are signed with cosign and carry SLSA provenance, and the cluster admission controller refuses to run any image lacking a valid signature, so an attacker cannot inject a swapped image.",
              "**No long-lived secrets:** the CI job and each pod use OIDC federation / SPIFFE to exchange their workload identity for short-lived (15-minute) cloud credentials from the secrets manager, instead of a static key in an env var. There is no standing secret to steal or leak.",
              "Common wrong turn: dumping PII or secrets into logs, or having no audit trail at all for admin actions, so a malicious admin leaves no trace.",
            ],
          },
          practice: {
            id: "sd-l8-audit-supplychain-practice",
            prompt:
              "Design the audit and supply-chain security for a healthcare records platform (Epic-style EHR) where every access to a patient chart must be logged for HIPAA, clinicians legitimately need broad read access, and a compromised build could endanger patient safety.",
            thinkAbout: [
              "Why is the unauthorized read the primary breach in healthcare?",
              "How does break-the-glass replace a hard BOLA denial with a monitored path?",
              "Why does a compromised build raise the supply-chain bar for patient safety?",
            ],
            modelAnswerOutline: [
              "Assumptions: an EHR where thousands of clinicians read millions of charts daily. HIPAA requires an audit control recording every PHI access, and the threat model includes both external attackers and curious insiders (the classic 'employee looks up a celebrity's chart').",
              "**Audit at read scale:** unlike most systems, here reads are the sensitive event, so I log every chart view, not just writes. Each event captures clinician identity, patient id, action (view/edit/print/export), timestamp, and the access context (which encounter or care relationship justified it). Volume is huge, so events stream through Kafka into a WORM audit store (Object Lock) with hash chaining, and a downstream anomaly detector flags access without a care relationship (an ER nurse opening a chart from a different hospital, or a spike of VIP lookups). The log's value is catching the insider who had valid credentials but no legitimate reason.",
              "**Authorization nuance:** clinicians need broad access for emergencies (break-the-glass), so I do not hard-block; instead break-the-glass access is allowed but heavily logged and reviewed, turning a BOLA-style hard denial into a monitored, accountable path. Object-level checks still apply for non-clinical roles.",
              "**Supply chain and patient safety:** a compromised deploy could alter dosing logic, so the bar is high. Every image is SBOM-inventoried, SCA-scanned, signed with cosign, and carries SLSA provenance, and the K8s admission controller refuses unsigned or unattested images. CI uses OIDC federation for short-lived credentials, no static keys. A signed, provenance-attested pipeline means a swapped or backdoored build cannot reach production undetected.",
              "Common wrong turn: logging only writes. In healthcare the unauthorized read is the primary breach, so an audit design that ignores reads fails HIPAA and misses the insider entirely.",
            ],
          },
        },
        {
          id: "sd-l8-incident-breach-response",
          title: "Security Incident & Breach Response, Key Compromise",
          summary:
            "Run detection, containment, eradication, recovery, lessons in order; rotate the compromised key via overlapping JWKS validity plus shortened TTLs so nobody is logged out; preserve evidence before cleanup with chain of custody; and start the GDPR 72-hour notification clock the moment you become aware.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["security", "incident-response", "compliance"],
          teach: {
            markdown: incidentBreachResponseTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l8-incident-breach-response-apply",
            prompt:
              "Design the incident and breach response plan for a compromised signing key in a multi-tenant SaaS, covering detection, containment, key rotation and revocation without downtime, forensic evidence, and regulatory notification.",
            thinkAbout: [
              "What are the ordered phases of incident response, and what is the goal of each?",
              "How do you rotate and revoke a widely-used key without taking the whole system down?",
              "What legal and forensic obligations start the moment you confirm a breach?",
            ],
            modelAnswerOutline: [
              "Assumptions: a multi-tenant SaaS under GDPR whose JWT signing key (or a privileged API key) is compromised and may already have been used to mint valid tokens. The key is used to verify every session, so a naive revocation logs everyone out.",
              "**The loop:** detection, containment, eradication, recovery, lessons-learned in order, with forensics and legal running in parallel from hour zero.",
              "**Detection:** a SIEM aggregates logs and alerts on anomalous key usage, geo/velocity anomalies, and honeytoken hits, and I keep an intake path because an outside party may report it first. Confirming the compromise starts every downstream clock. **Containment:** isolate affected systems (drop them from the load balancer, cut egress) and revoke active sessions, but do not wipe anything yet, because eradication before evidence preservation destroys forensics.",
              "**Key rotation without downtime (the crux):** because I publish keys via a JWKS with a `kid` per token and support overlapping validity, I add a new signing key to the JWKS (verifiers now accept both), flip signing to the new key, then remove the compromised `kid`. Nobody is logged out during the overlap. Under active compromise I compress the window: shrink token TTLs so attacker-minted tokens expire fast, pull the bad `kid`, and force re-authentication for affected sessions. Short-lived creds from Vault/KMS make this routine.",
              "**Eradication and recovery:** remove the foothold, rotate every potentially-exposed secret, restore from known-good state, and watch for reinfection. Immutable, object-locked backups give a clean recovery path if ransomware was involved. **Forensics (parallel):** snapshot volumes and preserve immutable logs before cleanup, with chain of custody. **Legal (parallel):** GDPR's 72-hour notification clock to the supervisory authority starts the moment I become aware, so legal and comms are activated at hour zero, and I notify affected tenants without undue delay if risk is high.",
              "Common wrong turn: wiping and rebuilding immediately to 'fix it fast,' which destroys forensic evidence, and doing a hard key cutover that logs out every tenant, converting a breach into a self-inflicted outage.",
            ],
          },
          practice: {
            id: "sd-l8-incident-breach-response-practice",
            prompt:
              "Design the breach response for a compromised root Certificate Authority signing key at a payments provider (a Stripe-scale system) where the key secures mTLS between thousands of internal services and any rotation risks a full internal outage.",
            thinkAbout: [
              "Why is a root CA harder to rotate than a JWT signing key?",
              "How does cross-signing plus staged trust distribution avoid a total outage?",
              "How do you contain the compromise while the staged rotation is in flight?",
            ],
            modelAnswerOutline: [
              "Assumptions: the compromised key is the private key of an internal root CA that signs the certificates every service uses for mTLS. Thousands of services trust this root. Naively revoking it makes every service distrust every other service at once: a total internal outage. This is the highest-stakes version of 'rotate a widely-used key.'",
              "**Why it is hard:** unlike a JWT signing key, a root CA is a trust anchor baked into every service's trust store. You cannot just publish a new one and flip; every workload has to trust the new root before you can stop trusting the old one.",
              "**Cross-signing and staged trust distribution:** (1) generate a new root CA in an HSM, (2) push the new root into every service's trust bundle so services trust BOTH old and new roots (a config rollout, not a cutover), (3) once telemetry confirms every workload trusts the new root, reissue leaf/intermediate certs signed by the new root (short-lived, via SPIFFE/SPIRE so this is automated and fast), (4) only then remove the compromised root from trust stores. The overlap window prevents the outage, the same overlapping-validity principle as JWKS applied to a PKI trust anchor.",
              "**Containment meanwhile:** shrink certificate TTLs hard (SPIFFE issues minutes-long certs), and use the CRL/OCSP path to revoke the specific compromised intermediates without yet touching the root.",
              "**Detection and forensics:** CA usage is tightly audited, so alert on any signing operation not originating from the approved issuance pipeline, and preserve HSM audit logs (they are your chain of custody). Legal: a payments provider under PCI-DSS plus GDPR notifies card networks/acquirers and the supervisory authority on the regulatory clocks, in parallel with the technical response.",
              "Common wrong turn: revoking the root immediately. It is decisive and catastrophic, freezing all internal mTLS. Staged cross-signed trust distribution is the only way to rotate a trust anchor without downtime.",
            ],
          },
        },
      ],
    },
  ],
}
