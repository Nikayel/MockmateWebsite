/**
 * Rounds a dollar amount to the nearest cent, ties rounding up. `amount` is a plain JavaScript
 * number (see src/money/money.ts), so this is floating point arithmetic scaled by 100, not
 * decimal arithmetic.
 */
export function roundHalfUp(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Rounds a whole payout and spreads it across `count` equal line items so the parts still
 * sum to the total - the remainder cents land on the first line item.
 */
export function allocateEvenly(total: number, count: number): number[] {
  if (count <= 0) return []
  const share = roundHalfUp(total / count)
  const shares = new Array(count).fill(share)
  const remainder = roundHalfUp(total - share * count)
  shares[0] = roundHalfUp(shares[0] + remainder)
  return shares
}
