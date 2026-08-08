# Launch checklist

Everything that cannot be fixed in code, gathered in one place from the SEO, observability, and
go-live audits of 2026-08-07. The code-side findings from those audits are fixed and committed; what
remains is dashboard and environment work only you can do.

Ordered by what breaks if you skip it.

---

## 1. Deploy the Firestore rules

Indexes are **DONE**. All 67 composite indexes were deployed to `danuxx-42bf3` on 2026-08-08,
including the 13 on `interview_sessions` behind the `/admin/sessions` filters, the 4 on
`feedback` behind the triage queue and the per-account daily submission cap, and the
`user_misconceptions` index whose absence 500'd the RAG misconception path. Verify build state in
the console; Firestore builds indexes asynchronously and a query against one still building
fails the same way a missing one does.

One index exists in the project that is not in `firestore.indexes.json`. It was left alone
rather than deleted, since `--force` is the only way to remove it and an index nobody declared
is more likely to be one somebody added from a console error link than one that is safe to drop.

**Rules are still NOT deployed, and this is the most important line in this document.**

```bash
firebase deploy --only firestore:rules
```

`firestore.rules` is deployed by hand, so the security fix that closed the free-Pro hole is
still only in the repo. Until you run this, any signed-in user can delete their profile and
recreate it as `subscription_tier: "pro"` straight from the browser console.

The file compiles clean as of 2026-08-08 (it previously emitted five warnings, all from one
unused helper, now removed). Run `pnpm test:integration` first: it exercises
`firestore-rules.integration.test.ts` against a local emulator using this same file, and should
stay at 23 passing.

Verify afterwards: `pnpm test:integration` runs `firestore-rules.integration.test.ts` against a local
emulator using the same rules file. It should stay at 23 passing.

## 2. Environment variables in Vercel Production

`.env.example` is now accurate; use it as the source of truth. `.env.local` is NOT a safe reference,
it holds live Stripe keys and a localhost app URL.

**Must be set or the product is broken:**

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://www.codesparring.dev`. Where Stripe returns the customer after checkout. Code now falls back to the canonical origin rather than localhost, but set it explicitly. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | The whole service-account JSON as one string. Without it the Admin SDK fails **silently** at boot and then every server auth, cron, and webhook fails at runtime. |
| All seven `NEXT_PUBLIC_FIREBASE_*` | The client SDK cannot initialize without them. Nothing renders. |
| `STRIPE_PRICE_ID_WEBSITE`, `STRIPE_PRICE_ID_WEBSITE_YEARLY` | Checkout returns a generic 500 when the matching one is unset. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Both throw at module eval, so a production build could not have succeeded without them. Confirm they are the LIVE keys. |
| `CRON_SECRET` | Every scheduled job 500s without it. |
| `DEEPGRAM_API_KEY` | Voice fails closed with a 503. Any key with at least Member permission; the old `keys:write` requirement is gone. |
| `ADMIN_USER_ID` | You lose admin access without it. |

**Should be set:** `SENTRY_DSN` (error tracking is silently off without it), `BREVO_API_KEY`
(all email), `DEEPSEEK_API_KEY` (AI fallback rung), `UPSTASH_REDIS_REST_URL` / `_TOKEN` (rate
limiting falls back to Firestore), `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (see section 7: without
it the verification meta tag renders empty and Search Console cannot verify the property).

**Leave unset unless you mean it:** `NEXT_PUBLIC_SITE_URL`. Unset is correct for production, where
`lib/seo/site.ts` falls back to the canonical `https://www.codesparring.dev`. It exists so preview
deployments can describe themselves honestly. Setting it to a preview or apex host in Production
would republish every canonical, every JSON-LD `@id`, and all sitemap URLs against the wrong origin,
which is the exact defect the SEO pass fixed.

**Delete:** `NEXT_PUBLIC_DEEPGRAM_API_KEY`. It is referenced nowhere and `NEXT_PUBLIC_` variables ship
to the client bundle.

**Do NOT set** `STRIPE_PRICE_ID_VSCODE` until the extension ships. The platform is chosen by the
client, so a cheaper vscode price lets anyone post `{"platform":"vscode"}` and buy the web product at
the extension's rate.

## 3. Stripe dashboard

- **Enable Stripe Tax.** `create-checkout` sets `automatic_tax: { enabled: true }`. If Tax is not
  activated with an origin address, `sessions.create` throws and checkout fails **100% of the time**
  with a generic "Something went wrong."
- **Confirm the webhook endpoint** is `https://www.codesparring.dev/api/webhook/stripe` and that the
  ~15 handled event types are subscribed.
- **Audit your promotion codes.** `allow_promotion_codes: true` combined with
  `payment_method_collection: "if_required"` means any 100%-off code grants $0 Pro to anyone who
  learns it.
- **Confirm live-mode price IDs** match the env vars above.

## 4. Auth will silently block every real user if these are wrong

Sign-in is OAuth-only (Google + GitHub). There is no email/password path, so any of these blocks
100% of signups:

- **Google Cloud Console → OAuth consent screen** must be "In production", not "Testing". In Testing
  only allowlisted accounts can sign in.
- **Firebase Console → Authentication → Settings → Authorized domains** must include
  `www.codesparring.dev` and `codesparring.dev`, or every attempt fails with `auth/unauthorized-domain`.
- **GitHub OAuth app** callback must be `https://<project>.firebaseapp.com/__/auth/handler`.

## 5. Cron

Five jobs are now declared in `vercel.json`; `email-notifications` stays on cron-job.org. See
`docs/CRON-SCHEDULE.md` for what each one does and what breaks without it.

- Confirm your Vercel plan allows five cron jobs and hourly frequency. Hobby is more limited; if the
  deploy is rejected, move the affected jobs to cron-job.org using the schedules in that document.
- Remove any duplicate cron-job.org entries for the five now in `vercel.json`. Duplicates are safe
  (every job was checked for duplicate-run safety) but pointless.
- After the first day, check the Cron Jobs tab. A 401 means `CRON_SECRET` does not match; a 500 with
  "Server misconfiguration" means it is unset.

## 6. Alerting: you currently have no push channel

Everything today is pull-based, so nothing will ever tell you the site is broken. About 30 minutes of
dashboard work:

- **`ERROR_WEBHOOK_URL`** → a Slack incoming webhook. The delivery code already exists; the variable
  is simply unset, and it is your only push channel.
- **An external uptime monitor** on `GET https://www.codesparring.dev/api/health` every 5 minutes.
  Use GET, not HEAD.
- **A Sentry alert rule**: more than 10 events in 5 minutes → notify. Warnings are now sampled at 10%
  so routine noise cannot burn the quota; errors and payment events are never sampled.
- **Provider-side spend caps** at Google, OpenAI, Deepgram, and Pinecone. This is the only backstop
  that does not depend on our own code being correct.

## 7. Before you announce

- **Run one real checkout end to end on the yearly plan**, which is the default. That single test
  proves Stripe Tax works, the success redirect is not localhost, the webhook fires, and the
  entitlement lands. Yearly is a one-time payment with no subscription object behind it, so it is the
  path with the least margin for error.
- **Switch `.env.local` to test keys** (`sk_test` / `pk_test` and test price IDs). It currently holds
  live keys next to a localhost app URL, so any local checkout test creates real charges.
- **Push.** Vercel deploys from Git, and local `main` is a long way ahead of `origin/main`.
- Do a voice interview on the deployed site once `DEEPGRAM_API_KEY` is mirrored.
- **Google Search Console, in this order.** None of the SEO work is measurable until this is done,
  and the order matters:
  1. Push and deploy, so the corrected canonicals and sitemap are actually live.
  2. Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel Production and redeploy. The meta tag is
     rendered from that variable, so it is empty until the variable exists at build time.
  3. Add the property as **`https://www.codesparring.dev`**, the same host `lib/seo/site.ts`
     publishes. A property on the apex reports on a host that only ever answers 308.
  4. Submit `/sitemap.xml`. It is generated from the course catalog at build time, so it grows on
     its own as lessons land and never needs resubmitting.
  5. Expect indexing to be partial and slow. The domain is new and has no inbound links, so the
     several hundred Learn URLs will be crawled well behind the ~30 marketing pages. That is normal
     and not a defect to chase.

---

## Known-open, deliberately not fixed

- **Referral rewards are paid manually.** The ledger accrues correctly and both the widget and the
  terms now say payout is manual with an address to claim at. Automating it (a Stripe coupon for free
  months, a payout path for cash) is a business decision.
- **The Edge-to-Node scoring consolidation stays deferred** until roughly 100 users. It would shift
  every DSA user's score from 87 to 94 on a clean session, which needs users to calibrate against.
- **`interview_sessions` documents are client-writable with no field validation.** A user can forge
  their own scores, which corrupts admin analytics and the research corpus but grants no entitlement:
  the rules already pin `user_id` on create and update, so cross-user injection is blocked. Tightening
  it further risks breaking the core interview loop and should be done with rules tests in place, now
  that `firestore-rules.integration.test.ts` gives somewhere to write them.
