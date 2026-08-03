# SEO-008: URL inspection on one lesson page

**Phase:** 3, post deploy
**Owner:** repo owner
**Blocking:** no
**Effort:** about 10 minutes, once

## Why

[SEO-006](SEO-006-post-deploy-sweep.md) checks what the server sends. This checks what **Google
renders**, which is not the same thing. The lesson pages are statically generated, so the teaching
content is in the initial HTML and this should pass trivially. Confirming it once is worth doing
anyway, because the failure mode it catches is severe and silent: if Google's rendered HTML were
missing the lesson body, the whole corpus would be indexed as near empty pages and no amount of
waiting would fix it.

There is a specific thing to verify here. Inline `check` widgets used to render as **empty HTML**,
because they were wrapped in a dynamic import with `ssr: false`. Hundreds of authored questions and
answer options were invisible to crawlers. That was fixed by moving the check family off the
`ssr: false` path, and this is where you confirm the fix holds in Google's renderer rather than just
in ours.

## Do this

1. Search Console, URL Inspection, paste a real lesson URL (pick one with check widgets, most Python
   and System Design lessons have them).
2. Click **Test Live URL**, then **View Tested Page**, then the **HTML** tab.
3. Confirm in the rendered HTML:
   - the lesson's teaching prose is present, not just the header and footer
   - at least one check widget's question text and its answer options are present
   - the declared canonical is the **public lesson URL**, not the `/workspace` URL and not another host
   - `Page fetch: Successful`, `Indexing allowed? Yes`
4. Under **More info**, check for blocked resources. A blocked script or stylesheet is not fatal for
   a statically rendered page, but it is worth knowing about.
5. Repeat for one System Design lesson, because that track's pages are the largest and its widgets
   are the most numerous.

## Done when

- Rendered HTML contains the lesson body and at least one check widget's text.
- Declared canonical matches the public lesson URL on the canonical host.
- Indexing allowed is Yes.

## If the widget text is missing

The check widgets are the densest question and answer content in the product, so this is worth
chasing. Reproduce locally against the built output rather than guessing:

```bash
pnpm build
grep -c "cswidget\|check-" .next/server/app/learn/python/*/*.html | head
```

and check `components/tutorials/widgets/CsWidget.tsx`, specifically that the `check` family is still
imported statically rather than through the `ssr: false` dynamic path.
