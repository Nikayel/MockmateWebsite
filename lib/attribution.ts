/**
 * First-touch marketing attribution (campaign tags and untagged landings).
 *
 * Captures utm_* params + referrer on the user's first landing and persists them
 * so every later analytics event can be tied back to the channel that produced it
 * (content / dev-communities / paid). First-touch only — we never overwrite the
 * original source once captured.
 *
 * Also captures two lighter-weight signals so short campus links and the product's
 * own referral share URLs are not invisible:
 *  - ?src=<channel>  maps to source=<channel>, medium "campaign"
 *  - ?ref=<code>     maps to source "referral", campaign=<code>
 * Explicit utm_* params always win over src/ref when both are present.
 */
import { getReferrerAttribution } from "./referrer-attribution"

const STORAGE_KEY = "cs_attribution"

// Cap untrusted UTM values so a crafted long query param can't bloat localStorage.
const MAX_VALUE_LENGTH = 200

function clean(value: string | null): string | undefined {
  if (!value) return undefined
  return value.slice(0, MAX_VALUE_LENGTH)
}

export interface Attribution {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  referrer?: string
  landingPage?: string
  capturedAt?: string
}

/**
 * Capture first-touch attribution from the current URL. Safe to call on every
 * page load — it no-ops if attribution already exists. Untagged landings use
 * the external referrer (organic search / referral), or direct. Client-only.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return
  try {
    const params = new URLSearchParams(window.location.search)
    // Lighter-weight campaign signals: campus/QR links (?src=) and referral share
    // URLs (?ref=). Present on landings that carry no utm_* params at all.
    const src = clean(params.get("src"))
    const ref = clean(params.get("ref"))
    // First-touch wins: don't overwrite an existing source.
    if (window.localStorage.getItem(STORAGE_KEY)) return

    // Explicit utm_* always wins; ?ref= then ?src= fill in the source only when no
    // utm_source was given, so a referral link still records source "referral".
    let source = clean(params.get("utm_source"))
    let medium = clean(params.get("utm_medium"))
    let campaign = clean(params.get("utm_campaign"))
    if (!source && ref) source = "referral"
    if (!source && src) source = src
    if (!medium && src) medium = "campaign"
    if (!campaign && ref) campaign = ref

    const inferred = getReferrerAttribution(
      typeof document !== "undefined" ? document.referrer : "",
      window.location.hostname
    )
    // Campaign tags take precedence over inferred organic/referral/direct.
    if (!source) {
      source = inferred.source
      if (!medium) medium = inferred.medium
    }

    const attribution: Attribution = {
      source,
      medium,
      campaign,
      term: clean(params.get("utm_term")),
      content: clean(params.get("utm_content")),
      referrer: inferred.referrer,
      landingPage: window.location.pathname.slice(0, MAX_VALUE_LENGTH),
      capturedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    // localStorage unavailable (private mode / blocked) — attribution is best-effort.
  }
}

/**
 * Read the stored first-touch attribution, if any. Client-only.
 */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Attribution) : null
  } catch {
    return null
  }
}

/**
 * Flatten stored attribution into analytics-friendly event params. Returns an
 * empty object when there's no attribution, so it's safe to spread.
 */
export function getAttributionParams(): Record<string, string> {
  // Also safe before React's AttributionCapture effect: the first named event
  // must carry the original landing, even when it fires during hydration.
  captureAttribution()
  const attribution = getAttribution()
  if (!attribution) return {}
  const params: Record<string, string> = {}
  if (attribution.source) params.utm_source = attribution.source
  if (attribution.medium) params.utm_medium = attribution.medium
  if (attribution.campaign) params.utm_campaign = attribution.campaign
  if (attribution.term) params.utm_term = attribution.term
  if (attribution.content) params.utm_content = attribution.content
  if (attribution.source) params.acquisition_source = attribution.source
  if (attribution.medium) params.acquisition_medium = attribution.medium
  if (attribution.landingPage) params.acquisition_landing_page = attribution.landingPage
  if (attribution.referrer) params.acquisition_referrer = attribution.referrer
  return params
}
