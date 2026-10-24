import { z } from "zod"

export const partnerHandoffActionSchema = z.object({ type: z.literal("open_sparra") }).strict()
export type PartnerHandoffAction = z.infer<typeof partnerHandoffActionSchema>
export const SPARRA_COMPOSER_ID = "sparra-message"
export const PARTNER_HANDOFF_REPLY =
  "I’m glad to help. Try Sparra, your AI partner, for a step-by-step walkthrough. I’ve opened its tab; bring your findings back here when you’re ready."

export function hasSparraPartner(scenarioType?: string): boolean {
  return (
    scenarioType === "bugfix" ||
    scenarioType === "system-design" ||
    scenarioType === "add-functionality"
  )
}
