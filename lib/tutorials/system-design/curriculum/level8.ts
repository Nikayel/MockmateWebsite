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

## Store a verifier you cannot reverse

The core rule: never store a password, store a verifier you cannot reverse. Use a memory-hard key derivation function: argon2id (preferred today), scrypt, or bcrypt. These are slow and memory-heavy on purpose so an attacker with your hashes cannot brute force billions of guesses per second on a GPU. A fast hash like MD5 or SHA-256 is the classic disqualifying answer: SHA-256 is designed to be fast, so a leaked SHA-256 table of 100M users is cracked at hundreds of billions of guesses per second. Tune argon2id to something like 19 MiB memory, 2 iterations, parallelism 1, then raise it until a single verify costs roughly 50 to 100 ms on your hardware. That latency is invisible per login but murders offline cracking.

Every password gets a unique random per-user salt, stored alongside the hash. Salt defeats precomputed rainbow tables and means two users with the same password get different hashes. A pepper is an optional secret added to every hash that lives outside the database (in a KMS or app config), so a database-only dump still lacks the pepper needed to crack anything. Salt is per-user and public; pepper is global and secret.

**Interview nuance:** "Survives a database dump" is the phrase to earn. It means: memory-hard KDF, per-user salt, and ideally a pepper held in a KMS the DB backup does not contain. If your answer is "we encrypt the passwords," that is wrong, passwords are hashed not encrypted, because you never need to reverse them.

## MFA and the recovery attack surface

MFA adds a second factor so a leaked password alone is not enough. Ranked by strength: hardware security keys and passkeys (phishing-resistant) > TOTP authenticator apps (RFC 6238, 30-second codes) > push approvals (watch for MFA-fatigue bombing) > SMS one-time codes. SMS is the weak one: SIM-swap attacks let an attacker port the victim's number and receive the code. Offer TOTP or keys as the default and treat SMS as a last resort. Use risk-based step-up: do not prompt MFA on a known device from a known location, do prompt on a new device, a new country, or a sensitive action like changing the recovery email.

The uncomfortable truth: account recovery is the real attack surface. Attackers rarely crack a good hash; they take over the reset flow. A "forgot password" email link, an SMS code, or a support agent who can be socially engineered is often weaker than the login itself. Recovery must be as strong as the primary factor: signed single-use tokens with short expiry, rate limits, and re-verification of a second factor before letting anyone change the password or MFA settings.

## Stop credential stuffing without leaking who exists

Defend against credential stuffing (attackers replaying passwords leaked from other sites) without leaking who exists. Check new passwords against known-breached lists using the Have I Been Pwned k-anonymity API (send a 5-char hash prefix, never the password). Throttle and add exponential backoff per account and per IP, add CAPTCHA on suspicious volume, and return the exact same generic error and timing for "wrong password" and "no such user." Any difference in message, status code, or response time is a user-enumeration oracle. Use a constant-time comparison for tokens and codes so timing does not leak how many characters matched.

**Recap:** hash passwords with a memory-hard KDF plus per-user salt (and a KMS pepper) so a DB dump is useless, layer MFA with SMS as the weak factor, harden account recovery because it is the real attack surface, and stop credential stuffing with breach checks and throttling while never revealing whether an account exists.
`.trim()

const passkeysWebauthnTeach = `
## Passkeys replace shared secrets with a device-held private key

Passkeys are the industry's shift away from shared secrets. A password is a secret both you and the server know, which means the server can leak it and a phishing site can capture it. A passkey is a public-key credential: your device generates a key pair, keeps the private key, and hands the server only the public key. That single change eliminates two of the biggest classes of attack.

## How it works

During registration (WebAuthn \`navigator.credentials.create\`), the authenticator (your phone's secure enclave, a laptop's TPM, or a hardware key like a YubiKey) generates a key pair scoped to the site's origin. The server stores the public key and a credential ID against the user account. During login (\`navigator.credentials.get\`), the server sends a random challenge; the authenticator signs it with the private key after a local user gesture (Face ID, fingerprint, PIN), and the server verifies the signature against the stored public key. The private key never leaves the device and is never transmitted.

**Interview nuance:** "Breach-proof on the server" is the phrase that lands. A stolen user table full of public keys is worthless to an attacker, because a public key cannot be used to authenticate, only to verify. Compare that to a password hash dump, which is crackable offline. There is simply nothing secret to steal on the server side.

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

## Device loss and coexistence

If a passkey is device-bound and the device is gone, the user is locked out unless they enrolled a second authenticator. Practical designs require enrolling at least two passkeys (phone plus a backup key), or fall back to another enrolled factor. Rolling out passkeys onto an existing password base uses progressive enrollment: keep passwords working, prompt users to add a passkey after a successful login, and over time let passkey-only users disable their password. Do not force a hard cutover; you will lock out the users whose only device just broke.

**Recap:** passkeys replace shared secrets with a device-held private key so the server stores only a useless-to-steal public key, origin binding makes them phishing-resistant where OTP and SMS are not, synced passkeys solve device loss for consumers while device-bound plus attestation suits enterprise, and you roll them out via progressive enrollment alongside passwords.
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

export const systemDesignLevel8: DesignLevel = {
  id: 8,
  slug: "security-privacy",
  title: "Level 8 — Security, Privacy & Multi-tenancy",
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
  ],
}
