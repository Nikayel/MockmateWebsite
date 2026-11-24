import { PRICING_CONFIG } from "@/lib/config"

/**
 * Maximum number of AI chat replies a guest receives per trial session before
 * being prompted to create a free account. Enforced server-side via an atomic
 * Firestore counter on the guest's `interview_sessions` document.
 */
export const GUEST_CHAT_TURN_LIMIT = 3

export const GUEST_CHAT_LIMIT_CODE = "GUEST_CHAT_LIMIT_REACHED" as const
export const GUEST_TURNS_REMAINING_HEADER = "X-Guest-Turns-Remaining"
export const GUEST_TURNS_LIMIT_HEADER = "X-Guest-Turns-Limit"

const GUEST_ID_PATTERN = /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidGuestId(guestId: string | null | undefined): guestId is string {
  if (!guestId) return false
  return GUEST_ID_PATTERN.test(guestId)
}

/**
 * Friendly inline signup prompt shown once a guest exhausts their trial AI turns
 * (or when no server guest session is available). Intentionally does not promise
 * returning directly into the live interview: login lands on the scenario browser
 * or sessions page while carrying over the guest's code and progress.
 */
export function buildGuestChatWallMessage(options?: { exhausted?: boolean }): string {
  const lead = options?.exhausted
    ? `You've used your ${GUEST_CHAT_TURN_LIMIT} free trial interviewer replies. Create a free account to keep talking with the interviewer`
    : "This is where the interviewer comes in, and it needs a free account"

  return (
    `${lead}: one click with Google or GitHub, ${PRICING_CONFIG.free.sessionsDisplay}, ` +
    "no card required. Your code and progress here carry over to your account.\n\n" +
    "**[Create a free account](/login?redirect=interview)**\n\n" +
    "Until then, Run Tests and Submit work right now, and the free courses in " +
    "[Learn](/learn) never use interview sessions."
  )
}
