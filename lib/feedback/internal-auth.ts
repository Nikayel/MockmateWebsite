import { timingSafeEqual } from "crypto"

/** Authenticate server-to-server feedback queue actions with the cron secret. */
export function verifyFeedbackInternalRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(secret)
  const supplied = Buffer.from(request.headers.get("x-feedback-internal-secret") ?? "")
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}
