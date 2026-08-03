# SEO-012: Bing Webmaster Tools and IndexNow

**Phase:** 5, optional
**Owner:** repo owner
**Blocking:** no
**Effort:** about 20 minutes

## Why

Low effort, small but real payoff, and genuinely optional. Two separate reasons:

1. **Bing is not just Bing.** It also feeds DuckDuckGo, and it is the index behind several AI answer
   surfaces. For a corpus of technical explainers, appearing in answer engines is plausibly worth as
   much as classical ranking, and it is a market with far less competition than Google for these
   queries.
2. **IndexNow is a push protocol.** Instead of waiting to be crawled, you notify Bing and Yandex that
   URLs changed. For a corpus that grows daily from a concurrent authoring loop, that is a better fit
   than waiting for a recrawl.

Do this after [SEO-004](SEO-004-search-console-verification.md), since if you added a DNS TXT record
for Google verification you are already in the right place to add Bing's.

## Do this

### Bing Webmaster Tools

1. Add the property at bing.com/webmasters. You can import directly from Google Search Console, which
   carries the verification across and is the fastest route.
2. Submit `https://codesparring.dev/sitemap.xml`, the same canonical host as everywhere else.

### IndexNow

1. Generate a key and host it at `https://codesparring.dev/<key>.txt`. In this repo that means a
   static file in `public/`.
2. Ping on deploy. The simplest honest version is a manual curl after a deploy that adds lessons:
   ```bash
   curl "https://api.indexnow.org/indexnow?url=https://codesparring.dev/learn/all&key=<your-key>"
   ```
3. If it proves useful, automate it as a post deploy step that submits changed URLs. Do **not** submit
   the entire corpus on every deploy; that is what the sitemap is for, and bulk resubmission of
   unchanged URLs is treated as spam.

## Done when

- Bing property verified and the sitemap submitted on the canonical host.
- Either an IndexNow key is live and you have pinged it once by hand, or you decided IndexNow is not
  worth it and noted that here.

## Do not bother with

Submitting to other search engines, directory listings, or anything calling itself an SEO submission
service. Google and Bing between them cover effectively the whole market this content is aimed at.
