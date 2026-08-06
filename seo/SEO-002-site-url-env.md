# SEO-002: Keep NEXT_PUBLIC_SITE_URL from contradicting the canonical host

> **Updated 2026-08-06.** Verified against the live project: `NEXT_PUBLIC_SITE_URL` is **not set in
> any Vercel environment**, so `DEFAULT_ORIGIN` in `lib/seo/site.ts` was supplying the origin all
> along. That default is now the `www` host (see [SEO-001](SEO-001-canonical-host.md)), which means
> **there is nothing to set** and the remaining work here is step 2, `NEXT_PUBLIC_APP_URL`. Setting
> the variable to duplicate the code default only creates a second place for the host to drift.

**Phase:** 1, pre deploy
**Owner:** repo owner (Vercel env vars), plus a one line repo change
**Blocking:** yes
**Effort:** about 10 minutes

## Why

`lib/seo/site.ts` resolves the canonical origin like this:

```ts
export const SITE_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
// falls back to https://codesparring.dev when unset
```

The env var **wins over the fallback**. So if `NEXT_PUBLIC_SITE_URL` is currently set to the `www`
host in Vercel, every canonical tag, every sitemap URL, and every JSON-LD `@id` will emit `www`
regardless of the apex decision in [SEO-001](SEO-001-canonical-host.md), and the two tickets will
contradict each other. This is a quiet failure: nothing errors, the pages just point at the wrong
host.

Second, smaller issue: `.env.example` documents `NEXT_PUBLIC_APP_URL` but has no entry for
`NEXT_PUBLIC_SITE_URL` at all, so nobody setting up the project learns that the canonical origin is
configurable.

Third, worth one look while you are in there: `lib/site-url.ts#getAppBaseUrl()` prefers
`NEXT_PUBLIC_APP_URL` and only then falls back to the shared origin. That function builds referral
share links and notification email links. If `NEXT_PUBLIC_APP_URL` is set to a different host than
`NEXT_PUBLIC_SITE_URL` in production, share links and canonical tags will disagree. They should
almost certainly be the same host.

## Do this

1. Vercel, project settings, Environment Variables. Confirm `NEXT_PUBLIC_SITE_URL` is either
   **unset** (preferred, so the code default is the only authority) or set to
   `https://www.codesparring.dev`. It must never name a host other than the one SEO-001 chose.
2. Set `NEXT_PUBLIC_APP_URL=https://www.codesparring.dev` in **Production**, or remove it so it
   falls through to the shared origin. This one builds referral share links and notification email
   links, so if it disagrees with the canonical host your emails point somewhere your canonical tags
   do not.
3. Add the variable to `.env.example` so the next person knows it exists:
   ```
   # Canonical public origin. Drives rel=canonical, sitemap URLs, JSON-LD ids, and robots.
   # Must match the primary domain configured in Vercel (see seo/SEO-001).
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. Redeploy, because `NEXT_PUBLIC_*` values are inlined at build time. Changing the variable without
   a rebuild changes nothing.

## Done when

```bash
# canonical on a lesson page points at the chosen host
curl -s https://www.codesparring.dev/learn/python | grep -o '<link rel="canonical"[^>]*>' | head -1
# expect: href="https://www.codesparring.dev/learn/python"

# the sitemap agrees, and nothing is left on the bare apex
curl -sL https://www.codesparring.dev/sitemap.xml | grep -c "<loc>https://codesparring\.dev"
# expect: 0

# robots points the sitemap at the same host
curl -sL https://www.codesparring.dev/robots.txt | grep -i sitemap
```

Locally you can confirm the wiring without deploying:

```bash
NEXT_PUBLIC_SITE_URL=https://codesparring.dev npx tsx -e "
import { SITE_ORIGIN, absoluteUrl } from './lib/seo/site'
console.log(SITE_ORIGIN, '|', absoluteUrl('/learn/python'))
"
```
