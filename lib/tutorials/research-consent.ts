/**
 * Research-participation consent (Admin SDK, server-only).
 *
 * WHY THIS EXISTS: the platform describes itself, in `docs/learner-model/RESEARCH-MEMO.md`,
 * as hosting a between-subjects field study, and it now logs item-level learning data.
 * There was no consent surface anywhere in the app. That is the gap this closes.
 *
 * THE SPLIT THIS ENCODES, and it is deliberate:
 *
 *   - Operating the product is not research. A learner's progress and responses are
 *     recorded because the product needs them to show progress, resume a lesson, and
 *     find broken content. That does not require a research consent, and gating it
 *     would silently break the product for anyone who declined.
 *
 *   - USING that data as research (analysis, publication, export into a study dataset)
 *     does require consent. So every response row is STAMPED with the learner's consent
 *     state at write time, and the research export filters on that stamp.
 *
 * Stamping at write time rather than joining at analysis time is the important detail:
 * consent is a fact about the moment the observation was made. A learner who consents
 * today has not thereby consented to last month's rows, and one who withdraws does not
 * retroactively un-consent the rows they already agreed to. Both directions are wrong
 * if you resolve consent lazily at export.
 */
import { adminDb } from "@/lib/firebase-admin"

const COLLECTION = "user_research_consent"

/** Bump when the disclosure text changes materially; a stale version re-prompts. */
export const RESEARCH_CONSENT_VERSION = "1.0"

export interface ResearchConsent {
  userId: string
  /** True only on an explicit opt-in. Absence of a decision is NOT consent. */
  consented: boolean
  /** Which disclosure the learner actually saw when they decided. */
  version: string
  /** ISO timestamp of the most recent decision. */
  decidedAt: string
}

/**
 * One learner's decision, or null if they have never been asked. Null is meaningfully
 * different from `{consented: false}`: the first means undecided, the second means
 * declined, and a study has to be able to tell those apart.
 */
export async function getResearchConsent(userId: string): Promise<ResearchConsent | null> {
  try {
    const snap = await adminDb.collection(COLLECTION).doc(userId).get()
    if (!snap.exists) return null
    const data = snap.data() as ResearchConsent | undefined
    if (!data || data.userId !== userId) return null
    return data
  } catch {
    // Never throw into a lesson write path. An unreadable consent doc is treated as
    // "no consent on record", which is the conservative direction.
    return null
  }
}

/** Record a decision. Overwrites: only the current stance is authoritative. */
export async function setResearchConsent(
  userId: string,
  consented: boolean
): Promise<ResearchConsent> {
  const consent: ResearchConsent = {
    userId,
    consented,
    version: RESEARCH_CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  }
  await adminDb.collection(COLLECTION).doc(userId).set(consent)
  return consent
}

/**
 * Whether a learner's data may be used as research RIGHT NOW. Consent recorded against
 * an outdated disclosure does not carry forward, because they agreed to different terms.
 */
export function isResearchUsable(consent: ResearchConsent | null): boolean {
  return consent?.consented === true && consent.version === RESEARCH_CONSENT_VERSION
}
