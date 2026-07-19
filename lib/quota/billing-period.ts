/**
 * Billing-period math for profile_quota.
 *
 * Pure date logic with zero Firebase imports so BOTH SDK sides share one period
 * model: the client helpers (lib/firestore-helpers), the Admin-SDK quota writers
 * (lib/stripe-helpers, lib/quota/session-start-admin), and the server quota read
 * (lib/quota-enforcement). QUOTA-1's root cause was this math living client-side
 * only while the server matched by calendar month — the two disagreed at month
 * boundaries.
 */

/**
 * Number of days in a month. monthIndex is 0-11 and may be out of range
 * (e.g. -1 or 12) — JS Date normalizes it. Day 0 of the next month is the last
 * day of this month.
 */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * The signup-day anniversary in a given month, with the day CLAMPED to the
 * month's length so a day of 29/30/31 never overflows into the next month.
 */
function clampedAnniversary(year: number, monthIndex: number, signupDay: number): Date {
  const day = Math.min(signupDay, daysInMonth(year, monthIndex))
  return new Date(year, monthIndex, day)
}

/**
 * Calculate the current billing period from a signup-date anniversary.
 *
 * EDGE-9: the day is clamped BEFORE the Date is constructed. The previous
 * version built `new Date(y, m, 31)`, which overflowed (Jan 31 signup, Feb
 * reference -> Feb 31 -> Mar 3), then clamped, sometimes yielding a "current"
 * period that started in the FUTURE and did not contain the reference date. The
 * quota lookup then failed to match and a fresh `sessions_used: 0` doc was
 * created, resetting the monthly cap ~4 weeks early every short month.
 */
export function calculateAnniversaryPeriod(
  signupDate: Date,
  referenceDate: Date = new Date()
): { periodStart: Date; periodEnd: Date } {
  const signupDay = signupDate.getDate()
  const now = referenceDate

  // Current month's clamped anniversary. If it is still in the future relative
  // to `now`, the current period actually started at last month's anniversary.
  let periodStart = clampedAnniversary(now.getFullYear(), now.getMonth(), signupDay)
  if (periodStart > now) {
    periodStart = clampedAnniversary(now.getFullYear(), now.getMonth() - 1, signupDay)
  }

  // Period end is the next clamped anniversary minus 1ms (end of the day before
  // the next period starts).
  const nextAnniversary = clampedAnniversary(
    periodStart.getFullYear(),
    periodStart.getMonth() + 1,
    signupDay
  )
  const periodEnd = new Date(nextAnniversary.getTime() - 1)

  return { periodStart, periodEnd }
}

/**
 * Calculate the current monthly billing period for a user.
 * Single source of truth used by all quota operations.
 *
 * Priority:
 * 1. Pro users with Stripe monthly billing → derive monthly window from Stripe's period_end
 * 2. Any user with a signup date → anniversary-based monthly billing
 * 3. Fallback → calendar month (1st to end of month)
 *
 * For yearly plans: subscription_current_period_end is 1 year out, so we
 * must NOT use it as a monthly period boundary. Yearly plans use anniversary billing.
 */
export function calculateBillingPeriod(options: {
  subscriptionTier?: "free" | "pro" | "enterprise"
  subscriptionType?: string
  signupDate?: Date | string
  stripeCurrentPeriodEnd?: Date | string
  referenceDate?: Date
}): { periodStart: Date; periodEnd: Date } {
  const now = options.referenceDate ?? new Date()
  const tier = options.subscriptionTier ?? "free"
  const isMonthlyStripe = tier === "pro" && options.subscriptionType !== "yearly"

  // For monthly Pro users with Stripe billing info, derive monthly window from Stripe's period_end
  if (isMonthlyStripe && options.stripeCurrentPeriodEnd) {
    const stripeEnd =
      typeof options.stripeCurrentPeriodEnd === "string"
        ? new Date(options.stripeCurrentPeriodEnd)
        : options.stripeCurrentPeriodEnd

    const periodEnd = new Date(stripeEnd)
    periodEnd.setHours(23, 59, 59, 999)

    const periodStart = new Date(periodEnd)
    periodStart.setMonth(periodStart.getMonth() - 1)
    periodStart.setDate(periodStart.getDate() + 1)
    periodStart.setHours(0, 0, 0, 0)

    return { periodStart, periodEnd }
  }

  // Anniversary billing based on signup date (works for yearly plans and free users)
  if (options.signupDate) {
    const signup =
      typeof options.signupDate === "string" ? new Date(options.signupDate) : options.signupDate
    return calculateAnniversaryPeriod(signup, now)
  }

  // Fallback to calendar month (shouldn't happen for real users)
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return { periodStart, periodEnd }
}

/**
 * Inputs calculateBillingPeriod needs from a profiles doc. Shared so the server
 * read path (getUserQuota) and writers resolve the SAME period from the same
 * profile fields.
 */
export interface BillingProfileFields {
  subscription_tier?: "free" | "pro" | "enterprise"
  subscription_type?: string
  created_at?: string
  subscription_current_period_end?: string
}

export function billingPeriodFromProfile(
  profile: BillingProfileFields | undefined,
  referenceDate?: Date
): { periodStart: Date; periodEnd: Date } {
  return calculateBillingPeriod({
    subscriptionTier: profile?.subscription_tier || "free",
    subscriptionType: profile?.subscription_type,
    signupDate: profile?.created_at,
    stripeCurrentPeriodEnd: profile?.subscription_current_period_end,
    referenceDate,
  })
}
