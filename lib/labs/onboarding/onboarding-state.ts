/**
 * First-run state for the lab onboarding cinematic.
 *
 * Onboarding is a first-run event, not a toll booth: the full cinematic plays
 * once per company/lab, and every visit after drops straight to the real
 * surface. That "once" is remembered here, in localStorage, keyed per config id
 * so Meridian and each Case Lab remember independently. Mirrors the shape of
 * `app/interview/_utils/bugfix-tour-state.ts` (versioned payload, defensive
 * parse) — this is deliberately per-device and cosmetic, so localStorage is the
 * right home, not a Firestore write on a cinematic nobody is grading.
 */

export const LAB_ONBOARDING_VERSION = "lab-onboarding-v1"
export const LAB_ONBOARDING_STORAGE_KEY = "codesparring:lab-onboarding:v1"

interface StoredOnboardingState {
  version: typeof LAB_ONBOARDING_VERSION
  /** config id -> ISO timestamp it was first completed or skipped. */
  seen: Record<string, string>
}

function readState(): StoredOnboardingState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LAB_ONBOARDING_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredOnboardingState>
    if (
      parsed.version === LAB_ONBOARDING_VERSION &&
      parsed.seen !== null &&
      typeof parsed.seen === "object"
    ) {
      return { version: LAB_ONBOARDING_VERSION, seen: parsed.seen as Record<string, string> }
    }
  } catch {
    return null
  }
  return null
}

/** Has this user already been through the cinematic for this config? */
export function hasSeenOnboarding(id: string): boolean {
  const state = readState()
  return Boolean(state?.seen[id])
}

/** Record that the cinematic has now been completed or skipped for this config. */
export function markOnboardingSeen(id: string): void {
  if (typeof window === "undefined") return
  const existing = readState()
  const next: StoredOnboardingState = {
    version: LAB_ONBOARDING_VERSION,
    seen: { ...(existing?.seen ?? {}), [id]: new Date().toISOString() },
  }
  try {
    window.localStorage.setItem(LAB_ONBOARDING_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // A full or unavailable localStorage just means the cinematic may replay next time — harmless.
  }
}
