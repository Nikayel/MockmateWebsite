/**
 * First-touch marketing attribution (UTM capture).
 *
 * Captures utm_* params + referrer on the user's first landing and persists them
 * so every later analytics event can be tied back to the channel that produced it
 * (content / dev-communities / paid). First-touch only — we never overwrite the
 * original source once captured.
 */

const STORAGE_KEY = "cs_attribution"

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const

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
 * page load — it no-ops if there are no UTM params or if attribution already
 * exists. Client-only.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return
  try {
    const params = new URLSearchParams(window.location.search)
    const hasUtm = UTM_PARAMS.some((key) => params.get(key))
    if (!hasUtm) return
    // First-touch wins: don't overwrite an existing source.
    if (window.localStorage.getItem(STORAGE_KEY)) return

    const attribution: Attribution = {
      source: clean(params.get("utm_source")),
      medium: clean(params.get("utm_medium")),
      campaign: clean(params.get("utm_campaign")),
      term: clean(params.get("utm_term")),
      content: clean(params.get("utm_content")),
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      landingPage: window.location.pathname,
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
  const attribution = getAttribution()
  if (!attribution) return {}
  const params: Record<string, string> = {}
  if (attribution.source) params.utm_source = attribution.source
  if (attribution.medium) params.utm_medium = attribution.medium
  if (attribution.campaign) params.utm_campaign = attribution.campaign
  if (attribution.term) params.utm_term = attribution.term
  if (attribution.content) params.utm_content = attribution.content
  return params
}
