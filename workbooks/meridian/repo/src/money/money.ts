/** Dollars, floating point, everywhere in Meridian today. */
export type Money = number

export function formatMoney(amount: Money, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`
}
