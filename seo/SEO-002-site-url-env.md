# SEO-002: Set NEXT_PUBLIC_SITE_URL to the apex in every Vercel environment

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

1. Vercel, project settings, Environment Variables. For **Production**, **Preview**, and
   **Development**, set:
   ```
   NEXT_PUBLIC_SITE_URL=https://codesparring.dev
   ```
   (Or the www host, if you chose www in SEO-001. They must agree.)
2. Check `NEXT_PUBLIC_APP_URL` in Production. If it is set to a different host, make it match, or
   remove it so it falls through to the shared origin.
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
curl -s https://codesparring.dev/learn/python | grep -o '<link rel="canonical"[^>]*>' | head -1

# the sitemap agrees, and nothing is on the other host
curl -s https://codesparring.dev/sitemap.xml | grep -c "https://www\."
# expect: 0

# robots points the sitemap at the same host
curl -s https://codesparring.dev/robots.txt | grep -i sitemap
```

Locally you can confirm the wiring without deploying:

```bash
NEXT_PUBLIC_SITE_URL=https://codesparring.dev npx tsx -e "
import { SITE_ORIGIN, absoluteUrl } from './lib/seo/site'
console.log(SITE_ORIGIN, '|', absoluteUrl('/learn/python'))
"
```
