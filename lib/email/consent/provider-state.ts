import type { ProviderConsent } from "./provider"

export function providerSuppressionApplies(
  profile: Record<string, unknown>,
  provider: ProviderConsent
): boolean {
  if (!provider.blocked) return false
  const state = profile.email_consent as Record<string, unknown> | undefined
  const job = profile.email_consent_sync as Record<string, unknown> | undefined
  if (job?.pending === true && job.intent === "marketing_only" && !provider.eventAt) return false
  // A marketing-only setting change must not silently disable requested reviews.
  if (state?.managed_marketing_block === provider.fingerprint) return false
  const optIn = Date.parse(String(state?.explicit_optional_opt_in_at ?? ""))
  const optOut = Date.parse(String(state?.provider_opt_out_at ?? ""))
  if (typeof provider.eventAt === "number" && optIn > provider.eventAt) return false
  return !(state?.provider_fingerprint === provider.fingerprint && optIn > optOut)
}
