/**
 * Shared cron-request authorization.
 *
 * Cron routes authenticate with `Authorization: Bearer <CRON_SECRET>`. This is the single
 * owner of that check so the six cron routes cannot drift:
 *  - fail closed when CRON_SECRET is unset (500 "Server misconfiguration");
 *  - length-guard before timingSafeEqual, which THROWS on unequal-length buffers;
 *  - timing-safe comparison, returning 401 "Unauthorized" on mismatch.
 */
import { timingSafeEqual } from "crypto"

export type CronAuthResult = { ok: true } | { ok: false; status: 401 | 500; error: string }

export function verifyCronRequest(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, status: 500, error: "Server misconfiguration" }
  }

  const expectedToken = `Bearer ${secret}`
  const headerValue = request.headers.get("authorization") || ""
  const isValid =
    headerValue.length === expectedToken.length &&
    timingSafeEqual(Buffer.from(headerValue), Buffer.from(expectedToken))

  return isValid ? { ok: true } : { ok: false, status: 401, error: "Unauthorized" }
}
