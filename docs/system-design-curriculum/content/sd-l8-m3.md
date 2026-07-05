> Module **sd-l8-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l8-m2](./sd-l8-m2.md) · Next: [sd-l8-m4](./sd-l8-m4.md)

# L8 · Encryption & Secrets

After this module you can design transport security that authenticates every service-to-service hop with mutual TLS, choose the right granularity of encryption at rest so a stolen database snapshot reveals nothing usable, and stand up a centralized secrets platform that rotates keys without downtime and solves the "secret zero" bootstrap with workload identity. These are the controls that turn "we encrypt everything" from a slogan into an architecture an auditor and an attacker both take seriously.

### sd-l8-encryption-transit-mtls: Encryption in Transit & mTLS

- **id:** `sd-l8-encryption-transit-mtls`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** tls, mtls, pki

#### Learn

Encryption in transit protects data on every network hop against eavesdropping (confidentiality) and silent modification (integrity). The baseline is **TLS 1.3**. It matters because it dropped the insecure cruft that plagued TLS 1.2: no RSA key exchange, no static Diffie-Hellman, no CBC-mode ciphers, no renegotiation. Every 1.3 handshake uses ephemeral (Elliptic-Curve) Diffie-Hellman, which gives **forward secrecy**: even if an attacker records ciphertext today and steals your server private key next year, past sessions stay unreadable because the session keys were ephemeral and thrown away. The 1.3 handshake is also one round trip instead of two, which cuts connection latency noticeably at p99.

On top of the protocol you need cert hygiene. Serve a modern cipher suite only (AES-GCM or ChaCha20-Poly1305, both authenticated), send **HSTS** so browsers refuse to downgrade to plaintext HTTP, and automate issuance and rotation with **ACME** (Let's Encrypt or an internal ACME CA). Manual cert renewal is how you get a 3 a.m. outage when a wildcard expires. Short lifetimes (90 days publicly, hours internally) shrink the damage window of a leaked key.

For **service-to-service** calls, ordinary TLS only proves the server's identity to the client. **Mutual TLS (mTLS)** makes both sides present certificates, so each workload cryptographically proves who it is. That cert becomes a portable **workload identity**: instead of "requests from inside the VPC are trusted," you get "this call came from the `payments` service, signed by our CA, cert not expired." A service mesh (Istio, Linkerd) or a sidecar (Envoy) typically issues short-lived certs (often 24 hours or less via SPIFFE/SVID) and rotates them automatically, so revocation is rarely needed because certs expire faster than you would notice a compromise.

```
  north-south (edge)              east-west (internal)
  client --TLS1.3--> [LB/CDN]     svcA <==mTLS==> svcB
     terminate here?                 both present certs,
        |                            both verify against CA,
   re-encrypt to origin             short-lived, auto-rotated
```

**Termination vs re-encryption.** Terminating TLS at the edge load balancer or CDN lets it inspect, route, and cache, but the hop from the LB to your origin is now in the clear unless you re-encrypt. For sensitive data you terminate at the edge and open a **new TLS (or mTLS) connection** to the backend, so plaintext never crosses an untrusted segment. Inside a mesh, every pod-to-pod hop is re-encrypted with mTLS.

**Interview nuance:** revocation is the hard part of PKI. OCSP and CRLs scale poorly and can fail open, so the industry answer is **short-lived certificates** (expire before revocation would matter) rather than relying on revocation lists. Certificate pinning stops a rogue CA but is operationally brittle: pin the wrong cert or forget to rotate the pin and you brick your own clients, which is why mobile teams pin to a CA or backup key, not a single leaf.

Recap: baseline on TLS 1.3 for forward secrecy and downgrade protection, automate cert issuance and rotation, and use mTLS with short-lived certs to give every service a verifiable identity so you never trust the network alone.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design end-to-end transport security for a microservices platform including internal service-to-service calls.

**Think about:**
- What is the TLS 1.3 baseline and cert lifecycle hygiene?
- How does mTLS give workload identity?
- Where do you terminate vs re-encrypt?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a public API fronting 50-plus internal microservices on Kubernetes, handling user PII, north-south traffic from browsers and mobile, plus heavy east-west service calls. I am protecting confidentiality and integrity on every hop and want each service to have a provable identity.

**North-south.** Clients hit a CDN or L7 load balancer over **TLS 1.3** with a modern cipher suite (AES-256-GCM, ChaCha20-Poly1305), HSTS with preload, and OCSP stapling. Public certs come from an ACME CA (Let's Encrypt or ACM) with 90-day lifetimes and fully automated renewal, so no cert is ever rotated by hand. I terminate TLS at the edge so it can do WAF, routing, and caching, then I **re-encrypt** from the edge to the origin: the internal hop rides its own TLS connection, so plaintext never touches an untrusted segment.

**East-west.** Every internal call runs over **mTLS** enforced by a service mesh (Istio or Linkerd with Envoy sidecars). The mesh CA issues short-lived certs (24 hours, auto-rotated) carrying a **SPIFFE identity** per workload. Now authorization is identity-based: a policy says `orders` may call `payments`, verified by cert, not by "it is inside the cluster." This is defense in depth: if an attacker lands a pod, they still cannot impersonate `payments` without its cert.

**Key lifecycle and PKI.** A hardware-backed root CA (in KMS/HSM) signs an intermediate that the mesh uses to mint leaf certs. I lean on **short lifetimes instead of revocation** because OCSP/CRL scale poorly and fail badly; a 24-hour cert self-heals from compromise. Forward secrecy is automatic in 1.3, and HSTS plus refusing pre-1.2 blocks downgrade attacks.

**Tradeoff I commit to:** mTLS everywhere adds handshake CPU and sidecar latency (roughly 1-3 ms per hop) and real operational complexity (mesh, CA, rotation). I accept it because the alternative, trusting the flat internal network, means one compromised host reads all east-west traffic.

**Common wrong turn:** encrypting only north-south traffic and leaving internal service calls in plaintext because "it is behind the firewall." That is exactly the lateral-movement path attackers use after an initial foothold.

**Self-check rubric:**
- [ ] I set TLS 1.3 as the baseline and named forward secrecy and downgrade protection.
- [ ] I specified automated cert issuance and rotation (ACME, short lifetimes), not manual renewal.
- [ ] I used mTLS for east-west traffic and explained it as workload identity (SPIFFE/mesh CA).
- [ ] I made an explicit terminate-then-re-encrypt decision for sensitive hops.
- [ ] I addressed revocation via short-lived certs and flagged the wrong turn of trusting the internal network.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design transport security for a bank's payment-processing platform that must pass PCI-DSS, spans two regions, and calls a third-party card network over the public internet. Explain how you would achieve mTLS at 200k internal RPS without the handshake cost becoming a bottleneck, and how you handle the external partner whose CA you do not control.

**Model answer (revealed on demand):**

At 200k internal RPS the danger is TLS handshake CPU, so the design goal is to amortize handshakes. Sidecars (Envoy) maintain **long-lived, pooled mTLS connections** between services and multiplex requests over HTTP/2, so the expensive asymmetric handshake happens per connection, not per request; steady-state traffic is cheap symmetric AES-GCM, ideally with AES-NI hardware acceleration. TLS 1.3 session resumption and 0-RTT (used carefully, since 0-RTT is replay-prone and should be off for payment mutations) further cut handshake cost. The mesh CA issues short-lived SPIFFE certs and rotates them out of band, so rotation never stalls request flow.

**PCI-DSS specifics:** cardholder data must be encrypted in transit over open networks with strong crypto, so TLS 1.2 is the floor and 1.3 the target, weak ciphers and protocols disabled and scanned quarterly. All internal segments carrying cardholder data use mTLS, which also supports PCI's network-segmentation and least-privilege requirements by making trust identity-based.

**Two regions:** each region runs its own intermediate CA under a shared hardware-backed root, and cross-region calls use mTLS with certs both sides trust via the common root. Traffic between regions rides an encrypted backbone or a re-encrypted TLS tunnel, never plaintext across the WAN.

**External card network:** I do not control the partner's CA, so I use standard server TLS to their published endpoint and **pin to their CA or a backup public key** rather than a single leaf, to survive their rotations. If the partner supports mTLS, I present a client cert from a CA they explicitly whitelist, exchanged out of band. All partner traffic egresses through a dedicated, monitored proxy so the connection is auditable, and I keep a documented rotation runbook because a silent partner cert change is a classic outage. The committed tradeoff: connection pooling and hardware crypto buy scale, but they mean a leaked long-lived session key exposes more traffic, which is why forward secrecy and short cert lifetimes stay non-negotiable.

### sd-l8-encryption-rest-field: Encryption at Rest, Field-Level & E2E

- **id:** `sd-l8-encryption-rest-field`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** encryption, envelope, crypto-shredding

#### Learn

Encryption at rest exists to make stolen storage useless: a lost disk, a leaked backup, or an exfiltrated database snapshot should decrypt to nothing. The critical design lever is **granularity**, because it decides how much a single breach exposes and what you can still do with the data.

The engine underneath everything is **envelope encryption**. You do not encrypt terabytes directly with a master key. Instead a **Data Encryption Key (DEK)** encrypts the actual data, and a **Key Encryption Key (KEK)** living in a KMS or HSM wraps (encrypts) the DEK. You store the wrapped DEK next to the ciphertext; to read, you send the wrapped DEK to KMS, which unwraps it (the KEK never leaves the HSM), and you decrypt locally. This gives cheap key rotation (re-wrap DEKs, no data rewrite), a hardware-guarded root of trust, and per-tenant or per-record DEKs so one leaked DEK exposes one tenant, not everyone.

```
 plaintext --AES-256-GCM(DEK)--> ciphertext   [stored together]
     DEK --wrap(KEK in KMS/HSM)--> wrapped DEK  [stored together]
     KEK  never leaves the HSM boundary
 breach of storage alone  => attacker has ciphertext + wrapped DEK, no KEK => useless
```

Now the **granularity ladder**, from coarse to fine:

- **Full-disk / volume encryption** (LUKS, cloud EBS encryption). Protects a physically stolen disk. But a running app and anyone with DB access see full plaintext, so it does nothing against a compromised app or a leaked query result. Zero searchability cost.
- **Database TDE (Transparent Data Encryption).** The DB encrypts files/pages. Same weakness: it is transparent, so a valid connection reads plaintext. Protects backups and stolen data files. Full query/index functionality preserved.
- **Application / field-level encryption.** Your app encrypts specific columns (SSN, card number) before writing, so the DB only ever holds ciphertext. A stolen snapshot **and** a compromised DB both reveal nothing for those fields. The cost is **searchability**: you cannot do `WHERE ssn = ?` or range queries on an encrypted column with randomized encryption.
- **Client-side / end-to-end (E2EE).** The client encrypts so the server never sees plaintext at all (Signal, WhatsApp, 1Password). Maximum protection, maximum functional cost: the server cannot search, index, or process the data, and you must solve key distribution and recovery.

The searchability tradeoff has a nuance: **deterministic** encryption (same plaintext to same ciphertext) allows equality lookups and joins but leaks which rows share a value and enables frequency analysis; **randomized** encryption (fresh nonce each time, the AES-256-**GCM** default) leaks nothing but kills search. Real systems use randomized for most fields and reach for deterministic, blind indexes, or dedicated searchable-encryption schemes only where lookup is required, accepting the leakage.

**Interview nuance:** "crypto-shredding" is how encryption meets **GDPR erasure and retention**. If each user's data is encrypted under a per-user DEK, deleting that one key makes all their data unrecoverable instantly, even copies sitting in backups, replicas, and archives you cannot practically hard-delete. So a per-tenant/per-user key hierarchy is not just breach isolation, it is your "right to be forgotten" mechanism. And remember to encrypt **backups and logs** too; a plaintext backup or a log line full of PII is the most commonly forgotten copy.

Recap: use envelope encryption with per-tenant/per-user DEKs wrapped by an HSM-held KEK, pick granularity (disk, TDE, field, E2E) by how much breach exposure and searchability you can trade, and design keys so crypto-shredding gives you instant, backup-proof erasure.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design encryption for a health/finance app storing PII so a stolen DB snapshot or backup reveals nothing usable.

**Think about:**
- How does envelope encryption (DEK/KEK) work?
- What is the searchability tradeoff across disk vs field vs client-side encryption?
- How does crypto-shredding support GDPR erasure?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an app holding health records and financial PII (names, SSNs, diagnoses, account numbers) under HIPAA and GDPR. Threat model: a stolen DB snapshot, a leaked backup, or a rogue DBA. I want those artifacts to decrypt to nothing, while keeping the app usable.

**Foundation: envelope encryption.** A cloud KMS or HSM holds the **KEK**, which never leaves the hardware boundary. Each tenant (and for the most sensitive users, each user) gets a **DEK** that encrypts their data with **AES-256-GCM**; the DEK is stored wrapped by the KEK next to the ciphertext. A stolen snapshot contains ciphertext plus wrapped DEKs but no KEK, so it is useless. This also makes rotation cheap: rotate the KEK by re-wrapping DEKs, no data rewrite.

**Granularity, chosen per field.** I do not stop at full-disk or TDE, because those are transparent and a compromised app or DBA reads plaintext. For the crown jewels (SSN, card number, diagnosis) I use **application field-level encryption**: the app encrypts before writing, so the DB only ever stores ciphertext, defeating both the stolen snapshot and the rogue DBA. Card data specifically I would **tokenize** to keep it out of my systems and shrink PCI scope. Non-sensitive columns stay plaintext for querying. I keep TDE/full-disk on underneath anyway as a cheap outer layer for backups and physical theft.

**Searchability.** Randomized AES-GCM kills search, so where I must look users up (say by email) I use **deterministic encryption or a keyed blind index** on that one field, accepting that it leaks equality, and keep everything else randomized. I explicitly do not make diagnosis or SSN searchable.

**Erasure via crypto-shredding.** Because each user has a DEK, GDPR "right to be forgotten" is executed by **deleting that user's DEK**. Their data instantly becomes unrecoverable everywhere, including replicas, WAL, and backups I cannot hard-delete. I also encrypt **backups and application logs** and scrub PII from logs, since those are the copies teams forget.

**Tradeoff:** field-level encryption and per-user keys add app complexity, key-management overhead, and lost query flexibility. I accept it because HIPAA/GDPR exposure from a plaintext breach is catastrophic.

**Common wrong turn:** claiming "encrypted at rest" while the key sits in the same database or config next to the data, so a snapshot that grabs the data grabs the key too. The KEK must live in a separate HSM/KMS trust boundary.

**Self-check rubric:**
- [ ] I described envelope encryption with a KMS/HSM-held KEK wrapping per-tenant/per-user DEKs.
- [ ] I placed the KEK in a separate trust boundary from the data (not next to it).
- [ ] I chose granularity per field and named field-level/tokenization for the crown jewels.
- [ ] I addressed the searchability tradeoff (randomized vs deterministic/blind index).
- [ ] I explained crypto-shredding for GDPR erasure and remembered to encrypt backups and logs.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the encryption architecture for a password manager like 1Password serving 100M vault items, where the company must never be able to read a customer's passwords even under subpoena, yet users must sync across devices, recover a lost password, and search their vault. Explain the key hierarchy and where each operation happens.

**Model answer (revealed on demand):**

The hard constraint is **true E2EE**: the server stores only ciphertext it cannot decrypt, so a subpoena or a full server breach yields nothing. All encryption and decryption happen **client-side**.

**Key hierarchy.** The user's **master password** never leaves the device and is never sent to the server. Combined with a high-entropy **Secret Key** stored on the device (1Password's actual design), it is stretched via a slow KDF (PBKDF2/Argon2, hundreds of thousands of iterations) into a key that unwraps the user's **private key**. Each vault has a symmetric **vault key**; individual items are encrypted with per-item keys wrapped by the vault key (envelope encryption again, just rooted in the user, not a server HSM). The server stores wrapped keys and ciphertext blobs only.

**Sync across devices.** Because the master password plus Secret Key regenerate the unwrapping key, any device that has both can pull the encrypted blobs and decrypt locally. New-device setup transfers the Secret Key out of band (QR/secret) so the server never holds it.

**Recovery.** This is the honest tradeoff of E2EE: if the server cannot read your data, it cannot reset a forgotten master password. So recovery is not server-side reset but mechanisms like a printed Emergency Kit, or for teams a **recovery keypair** held by an admin whose public key also wraps the vault key, so an admin can re-grant access without the server ever seeing plaintext.

**Search.** The server cannot search ciphertext, so search happens **on the client** after the vault is decrypted locally into memory, or via a client-built encrypted index. This is acceptable because a personal vault is small enough to decrypt and search on-device.

The committed tradeoff: E2EE gives the strongest possible confidentiality and a clean legal story (we cannot comply with a plaintext demand because we have no plaintext), at the cost of no server-side recovery, no server-side search or processing, and real key-distribution complexity. The common wrong turn here is holding a server-side "master key" for convenience, which quietly destroys the entire E2EE guarantee.

### sd-l8-secrets-kms: Secrets & Key Management (KMS/HSM, Rotation)

- **id:** `sd-l8-secrets-kms`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** secrets, kms, workload-identity

#### Learn

Secrets (DB passwords, API keys, signing keys, TLS private keys) are the credentials that unlock everything else, so how you store, distribute, and rotate them is a top-tier design problem. The failure everyone starts with is secrets in **env vars, config files, or source control**. Those leak through git history, CI logs, crash dumps, `/proc`, and container images, and they cannot be rotated or audited. The first principle is a **dedicated secret store**: HashiCorp Vault, AWS/GCP Secrets Manager, or a cloud KMS.

**KMS vs HSM.** A **KMS** is a managed key service with an API for encrypt/decrypt/sign where keys never leave the service. An **HSM** is the tamper-resistant hardware (often **FIPS 140-2 Level 3** certified) that actually holds the root keys; managed KMS is usually HSM-backed. The pattern is a **key hierarchy** with a hardware-backed **root of trust**: the HSM holds the root KEK, which wraps intermediate keys, which wrap DEKs. Nothing sensitive exists in plaintext outside the hardware boundary, and you get a single audited choke point for every key operation.

**Rotation without downtime** is the operational heart. Naive rotation ("change the password, restart everything") causes an outage the moment the old credential dies before every client picks up the new one. The fix is **versioned secrets with a dual-secret (overlap) window**: create version N+1 while N still works, roll consumers over gradually, confirm nothing uses N, then revoke N. For encryption keys, decrypt with old-or-new during the window and re-encrypt lazily. This turns rotation from a risky event into a routine, reversible rollout.

**The "secret zero" problem.** If every secret lives in Vault, the app needs a credential to authenticate to Vault, so what protects *that* credential? Bootstrapping trust with a long-lived static token just moves the problem and recreates the thing you were avoiding. The modern answer is **workload identity**: the platform vouches for the workload so no pre-placed secret is needed.

- On Kubernetes / cloud, the workload gets a **short-lived OIDC/JWT identity token** from the platform (IRSA on EKS, GKE Workload Identity), and the secret store trusts that issuer. No static credential is ever placed on the box.
- **SPIFFE/SPIRE** issues a cryptographic **SVID** (an X.509 cert or JWT) that attests the workload's identity, which Vault or a mesh accepts.

The workload then fetches **dynamic, short-lived secrets**: instead of a shared static DB password, Vault generates a unique DB credential that lives 1 hour and is auto-revoked. A leak is self-limiting, and every credential is traceable to one workload.

```
 secret zero solved:
   platform (K8s/cloud) --signs--> short-lived OIDC/SVID for the pod
   pod --presents identity--> [Vault] --verifies issuer--> issues
        dynamic DB cred (TTL 1h), unique per pod, auto-revoked
   no static credential ever stored on the pod
```

**Interview nuance:** rotation and dynamic secrets are useless without **least-privilege policies and per-access audit logging**. Every secret read should be logged (who, which workload, when) so a leak has a blast-radius answer, and policies should scope each workload to only the secrets it needs. Pair this with **leaked-credential scanning** (pre-commit hooks, GitHub secret scanning) to catch the static keys that inevitably slip through, and auto-revoke on detection.

Recap: put secrets in a dedicated store rooted in an HSM-backed KMS, rotate with versioned dual-secret windows so there is no downtime, solve secret zero with platform-issued workload identity that hands out short-lived dynamic secrets, and log every access under least-privilege policies.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a centralized secrets platform for 500 microservices consuming 10k secrets with rotation and per-access audit.

**Think about:**
- Why a dedicated secret store over env vars/config files?
- How does workload identity solve the secret-zero problem?
- How do you rotate without downtime?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 500 microservices on Kubernetes, roughly 10k secrets (DB creds, API keys, TLS keys, signing keys), multi-team, under SOC 2 / compliance that demands per-access audit and rotation.

**Store.** I run **HashiCorp Vault** (or the cloud-managed equivalent) as the single secret store, rooted in an **HSM-backed KMS** that holds the master/unseal key, so the root of trust is FIPS-validated hardware. No secret ever lives in env vars, config files, or git; those leak through history, CI logs, and images and cannot be rotated or audited. Vault's key hierarchy wraps everything under that hardware root.

**Secret zero via workload identity.** Each pod authenticates to Vault using a **platform-issued identity**, not a pre-placed token: the Kubernetes ServiceAccount JWT (or SPIFFE/SPIRE SVID), which Vault verifies against the cluster's OIDC issuer. So no bootstrap secret sits on any box, which is what makes 500 services tractable. Vault maps that identity to a **least-privilege policy** scoping the workload to only its secrets.

**Dynamic, short-lived secrets.** Wherever possible I issue **dynamic secrets**: Vault generates a unique DB credential per pod with a 1-hour TTL and auto-revokes it. Leaks are self-limiting and every credential traces to one workload. Static third-party keys that cannot be dynamic get scheduled rotation.

**Rotation without downtime.** Versioned secrets with a **dual-secret overlap window**: create version N+1 while N still works, roll consumers (they re-fetch on a lease/TTL refresh, or via a sidecar like Vault Agent), verify nothing uses N, then revoke N. For signing/encryption keys, accept old-or-new during the window and re-sign/re-encrypt lazily. Rotation becomes a routine reversible rollout, not an outage.

**Audit and hygiene.** Every read is logged (identity, secret, timestamp) to an append-only audit log for SOC 2 and blast-radius analysis. I add **leaked-credential scanning** (pre-commit + GitHub secret scanning) with auto-revoke on hit.

**Tradeoff:** Vault plus dynamic secrets adds a critical dependency and operational burden (HA, unseal, caching for when Vault blips), so I run it HA with sidecar caching so a Vault hiccup does not take down 500 services. **Common wrong turn:** long-lived static credentials handed out once and never rotated, or a bootstrap token in an env file, which quietly rebuilds the exact problem the platform was meant to remove.

**Self-check rubric:**
- [ ] I used a dedicated store (Vault/Secrets Manager) rooted in HSM-backed KMS, not env/config/git.
- [ ] I solved secret zero with platform-issued workload identity (K8s SA JWT / SPIFFE), no pre-placed token.
- [ ] I used dynamic short-lived secrets where possible to make leaks self-limiting.
- [ ] I described versioned dual-secret rotation with no downtime.
- [ ] I included per-access audit logging, least-privilege policies, and leaked-credential scanning.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design secrets and key management for a fintech that signs 50M payment transactions per day with private signing keys that must be FIPS 140-2 Level 3 protected, operates in 3 regions, and needs an emergency key-compromise response that revokes and rotates a root signing key without halting payments. Explain the key hierarchy and the compromise runbook.

**Model answer (revealed on demand):**

At 50M signatures/day the signing keys are the crown jewels and regulation demands **FIPS 140-2 Level 3**, so the private signing keys **never exist outside an HSM**. The app does not hold the key; it calls the HSM's sign API (CloudHSM or a dedicated appliance), so a full server compromise leaks no key material. At ~600 signs/sec average (higher at peak) I front the HSMs with a signing service that pools connections and batches, since HSM sign throughput is the bottleneck, and I size an HSM cluster per region for headroom.

**Key hierarchy.** A **root signing key** in the HSM signs (or certifies) **intermediate signing keys**; day-to-day transaction signing uses short-lived intermediates, so the root is used rarely and stays offline/quorum-protected. This is deliberate: rotating an intermediate is routine, and the root almost never has to move. DEKs/KEKs for data at rest sit under the same HSM root of trust.

**Three regions.** Each region has its own HSM cluster holding replicas of the intermediates (keys replicated only inside the HSM/KMS boundary via vendor-secure channels), so a regional outage does not stop signing and cross-region latency never sits in the signing path. The root is held in one hardened region under M-of-N quorum (multiple officers must approve a root operation).

**Compromise runbook (rotate a root without halting payments).** 1) Detect and raise, freeze issuance of new intermediates from the suspect root. 2) Stand up a **new root** via the quorum ceremony in the HSM. 3) Issue **fresh intermediates** from the new root and push them to regional signing services. 4) Flip signing to new intermediates using the **dual-key overlap window**, so payments keep flowing on still-valid intermediates while the switch happens, no halt. 5) Distribute the new root's public key/trust anchor to verifiers, then **revoke** the old root and its intermediates. 6) Re-verify or re-sign anything that must chain to the new root.

The committed tradeoff: HSM-bound keys and quorum ceremonies add latency and operational friction and cap throughput, which is exactly why the hierarchy keeps the root cold and does high-volume signing with cheap-to-rotate intermediates. The common wrong turn is a single long-lived signing key used directly for all traffic, which turns a compromise into a full stop instead of an overlap-window rotation.
