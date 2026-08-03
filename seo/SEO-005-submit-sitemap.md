# SEO-005: Resubmit the sitemap after the corpus goes public

**Phase:** 2, deploy day
**Owner:** repo owner
**Blocking:** no, but it is the difference between Google finding the corpus in days versus weeks
**Effort:** about 5 minutes, plus a check 48 hours later

## Why

The sitemap goes from 82 URLs to roughly 537 in a single deploy (measured 2026-08-03; run the
command in the [README](README.md) for the current figure). Google will find them eventually by
crawling the internal link graph, but an explicit resubmit plus a Coverage check is how you find out
within days whether something is structurally wrong, rather than waiting and guessing.

The old sitemap advertised three Learn URLs that redirected to `/login`. Those are gone, replaced by
real 200-serving pages. A resubmit also prompts Google to recheck the URLs it previously classified
as redirects.

## Do this

1. Confirm the deploy is live and the sitemap serves the new URLs:
   ```bash
   curl -s https://codesparring.dev/sitemap.xml | grep -c "<loc>"
   curl -s https://codesparring.dev/sitemap.xml | grep -c "/learn/"
   curl -s https://codesparring.dev/sitemap.xml | grep -c "/workspace"   # expect 0
   ```
2. Search Console, Sitemaps, submit `https://codesparring.dev/sitemap.xml`.
   If a sitemap is already listed on the other host, remove it after SEO-001 lands so you are not
   maintaining two.
3. Note the "Discovered URLs" figure it reports.
4. **Come back in 48 hours.** Discovered URLs should have climbed toward the submitted total. If it
   is still near the old number, something is wrong: check that the sitemap is reachable, that
   robots.txt does not disallow `/learn`, and that the URLs in it return 200 rather than redirects.

## Done when

- The sitemap is submitted on the canonical host and shows status Success.
- 48 hours later, Discovered URLs is in the same order of magnitude as the submitted count.
- No sitemap remains submitted on the non canonical host.

## Expect churn

Coverage will be noisy for a couple of weeks after a jump this size. That is normal. What is **not**
normal, and what you are watching for in [SEO-007](SEO-007-coverage-sweep.md), is bulk
"Page with redirect" or bulk "Excluded by noindex" on `/learn` URLs. Either of those means a
canonical or metadata bug, not a ranking problem.

## Related

Legacy `/learn/sql/*` URLs now 308 to `/learn/data-engineering/*` (configured in `next.config.mjs`).
If any of the old SQL URLs were indexed, Google will process those redirects on its own schedule.
Do not submit the old URLs; the redirect is enough.
