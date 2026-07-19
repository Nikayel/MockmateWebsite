/**
 * Canonical site base URL resolution.
 *
 * Single source of truth so referral share links and notification emails cannot
 * drift onto a dead domain. Prefers the app URL, then the public site URL used by
 * the layout/sitemap canonical, then the live production origin as a last resort.
 *
 * Matches the layout/sitemap fallback (https://codesparring.dev) instead of the
 * retired mockmate.dev brand, so a missing or renamed env var still points on-product.
 */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://codesparring.dev"
  )
}
