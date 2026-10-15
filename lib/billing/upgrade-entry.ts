export type UpgradeSource = "roadmap" | "practice-plan" | "direct"
export type CheckoutPlan = "monthly" | "yearly"

/** Attribution only, never an entitlement or an arbitrary redirect destination. */
export function normalizeUpgradeSource(value: unknown): UpgradeSource {
  return value === "roadmap" || value === "practice-plan" ? value : "direct"
}

export function upgradePath(source: UpgradeSource, billing: CheckoutPlan): string {
  return `/upgrade?${new URLSearchParams({ source, billing })}`
}

export function checkoutReturnPaths(source: UpgradeSource, billing: CheckoutPlan) {
  const path = upgradePath(source, billing)
  return {
    success: `${path}&success=true&session_id={CHECKOUT_SESSION_ID}`,
    canceled: `${path}&canceled=true`,
  }
}
