# SEO-004: Confirm Search Console verification actually resolves in production

**Phase:** 1, pre deploy
**Owner:** repo owner
**Blocking:** soft. Nothing breaks without it, but SEO-003, SEO-005 and SEO-007 all need a verified
property, so it blocks them in practice.
**Effort:** about 10 minutes

## Why

`app/layout.tsx` emits the Google verification meta tag from an environment variable:

```ts
// Search Engine Verification
verification: {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
},
```

If that variable is unset in Vercel Production, `verification.google` is `undefined` and Next emits
**no meta tag at all**. Silently. The property then stays unverified, or stays verified only through
some other method (DNS TXT, HTML file) that nobody has written down.

Worth resolving now rather than on deploy day, because if the property turns out to be verified only
on the `www` host, [SEO-001](SEO-001-canonical-host.md) will move the canonical host out from under
it and you will lose reporting exactly when you need it.

## Do this

1. Check whether the meta tag is live:
   ```bash
   curl -s https://codesparring.dev | grep -i "google-site-verification"
   ```
2. If it is missing, decide which verification method is authoritative and make it explicit:
   - **Preferred: DNS TXT record**, because it verifies the domain regardless of host, hosting
     provider, or framework, and it survives the apex/www change in SEO-001. Add it at your DNS
     provider and verify the property as a **Domain property** in Search Console.
   - Or set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel Production and redeploy
     (`NEXT_PUBLIC_*` is inlined at build time, so a redeploy is required).
3. In Search Console, make sure you have a **Domain property** (`codesparring.dev`) rather than only
   a URL prefix property. A domain property covers apex, www, http and https in one place, which is
   what you want given SEO-001.

## Done when

- Search Console shows the property as verified, and you know which method is doing the verifying.
- The verification survives a redeploy (that is, it is not depending on an env var nobody has set).
- If you kept the meta tag route, `curl -s https://codesparring.dev | grep -i google-site-verification`
  returns a tag.

## Note

If you add a Bing property too, do it now while you are in the DNS record anyway. See
[SEO-012](SEO-012-bing-indexnow.md), which is optional but cheap once the DNS record exists.
