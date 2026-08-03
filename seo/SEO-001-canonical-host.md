# SEO-001: Make the apex canonical and redirect www to it permanently

**Phase:** 1, pre deploy
**Owner:** repo owner (Vercel dashboard, no code change)
**Blocking:** yes. Do this before the corpus goes public.
**Effort:** about 5 minutes, plus DNS propagation

## Why

Every `rel=canonical`, every JSON-LD `@id`, and all ~537 sitemap URLs now resolve against
`https://codesparring.dev` (the apex). That was your decision and the code follows it consistently.

Production does not. Measured during this work:

```
$ curl -sI https://codesparring.dev/learn/python
HTTP/2 307
location: https://www.codesparring.dev/learn/python
```

Two separate problems in one line:

1. **The direction is backwards.** The apex is canonical in the code, but production redirects the
   apex away to `www`. So the sitemap points at URLs that bounce.
2. **307 is temporary.** A temporary redirect explicitly tells Google not to consolidate ranking
   signals on the target. Whatever authority the domain has stays split across two hosts.

Publishing several hundred new URLs against a host that answers with a temporary redirect multiplies
an existing defect rather than introducing one. This is the single highest leverage item in the
folder, and it is the reason it is first.

## Do this

1. Vercel dashboard, project settings, Domains.
2. Make `codesparring.dev` the **primary** domain.
3. Set `www.codesparring.dev` to redirect to `codesparring.dev` with status **308 Permanent**
   (not 307, not 302).
4. Wait for propagation, then verify.

## Done when

```bash
# www redirects to apex, permanently
curl -sI https://www.codesparring.dev/learn | grep -iE "^HTTP|^location"
# expect: HTTP/2 308   and   location: https://codesparring.dev/learn

# the apex serves directly, no redirect
curl -sI https://codesparring.dev/learn | grep -iE "^HTTP|^location"
# expect: HTTP/2 200, and NO location header

# a deep lesson URL behaves the same
curl -sI https://www.codesparring.dev/learn/python | grep -iE "^HTTP|^location"
# expect: HTTP/2 308 to the apex
```

## If you decide you want www instead

Defensible, but then this is a code change too, not just a dashboard one. Set
`NEXT_PUBLIC_SITE_URL=https://www.codesparring.dev` in every Vercel environment (see
[SEO-002](SEO-002-site-url-env.md)) and redirect apex to www with a 308. Everything else follows
automatically, because the origin is a single constant in `lib/seo/site.ts`. Do not mix: the redirect
direction and the env var must agree, or canonical tags will point at redirecting URLs.

## Notes

Nothing in CI can catch a regression here, because it is platform configuration rather than code. If
the domain setup is ever changed, re-run the three curl checks above.
