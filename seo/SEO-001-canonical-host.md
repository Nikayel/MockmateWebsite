# SEO-001: Make www canonical and redirect the apex to it permanently

**Phase:** 1, pre deploy
**Owner:** repo owner (Vercel project settings) plus a one line repo change
**Blocking:** yes. This is the highest leverage item in the folder.
**Effort:** about 5 minutes

> **Decision reversed 2026-08-06.** This ticket originally said to make the apex canonical. Checked
> against the live setup, `www` is the better host and the reasoning is in "Which host" below. The
> code default in `lib/seo/site.ts` now emits `www` to match. What did **not** change is the part
> that actually matters: the redirect must be a **308**, whichever direction it points.

## Why

Every `rel=canonical`, every JSON-LD `@id`, and all ~537 sitemap URLs resolve against a single
constant in `lib/seo/site.ts`. Production serves a different host than that constant named, so the
two contradict each other. Measured during this work:

```
$ curl -sI https://codesparring.dev/learn/python
HTTP/2 307
location: https://www.codesparring.dev/learn/python
```

Two separate problems in one line:

1. **The direction contradicts the code.** The sitemap advertised apex URLs and the apex answered
   with a redirect, so every URL handed to a crawler bounced, and the page it landed on named the
   bouncing URL as its canonical.
2. **307 is temporary.** A temporary redirect explicitly tells Google **not** to consolidate ranking
   signals on the target. Whatever authority the domain has stays split across two hosts. This half
   is wrong no matter which host wins.

Publishing several hundred new URLs against a host that answers with a temporary redirect multiplies
an existing defect rather than introducing one.

## Which host, and why www won

Both are defensible. `www` was chosen for three reasons that only became visible against the live
configuration:

1. **It is already the production domain.** `www.codesparring.dev` serves the app today; the apex is
   configured purely as a redirect. Keeping it means less to change and less to break.
2. **`www` resolves through a CNAME; an apex cannot.** An apex has to be an `A` record pinned to a
   fixed IP, which is exactly why the platform periodically asks for a DNS update when it expands
   its address range. A CNAME lets the CDN move traffic without touching the registrar. This is the
   platform's own recommendation and the substantive argument.
3. **The apex advantage was illusory.** People type `codesparring.dev` either way and the redirect
   carries them. The canonical host is a crawler-facing decision, not a human-facing one, so nothing
   on a slide or a business card has to change.

Changing this again later is expensive: every consolidated signal has to re-consolidate. Treat it as
settled.

## Do this

1. Vercel dashboard, **project** settings (not the team domain page), Domains.
2. Edit `codesparring.dev`. Keep the redirect to `www.codesparring.dev`, change the status code to
   **308 Permanent** (not 307, not 302).
3. Confirm `www.codesparring.dev` is the domain assigned to Production.
4. Redeploy so the `www` origin ships, then verify.

`NEXT_PUBLIC_SITE_URL` does not need to be set: the default in `lib/seo/site.ts` is now the `www`
host. See [SEO-002](SEO-002-site-url-env.md) for when you would set it anyway.

## Done when

```bash
# the apex redirects to www, permanently
curl -sI https://codesparring.dev/learn | grep -iE "^HTTP|^location"
# expect: HTTP/2 308   and   location: https://www.codesparring.dev/learn

# www serves directly, no redirect
curl -sI https://www.codesparring.dev/learn | grep -iE "^HTTP|^location"
# expect: HTTP/2 200, and NO location header

# the sitemap advertises the host that actually serves
curl -sL https://www.codesparring.dev/sitemap.xml | grep -m1 "<loc>"
# expect: a www URL
```

## The ordering trap, if this is ever revisited

Never point the serving host at the redirecting host while the redirect is still in place. Setting
`www -> apex` while `apex -> www` still exists is an infinite loop and the site goes down instantly.
The safe order is always: make the new canonical serve first, **then** point the old host at it.

## Notes

Nothing in CI can catch a regression here, because the redirect is platform configuration rather
than code. The code half is covered: `app/__tests__/sitemap.test.ts` derives every assertion from
`SITE_ORIGIN`, so it follows the constant rather than pinning a host. If the domain setup is ever
changed, re-run the three checks above.
