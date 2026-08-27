/**
 * Deterministic hidden-suite variant selection (docs/sprint-labs/
 * AGENT-CONTEXT.md §5.3 reference, WORKBOOK-SPEC.md §5 rule 3: re-attempts
 * draw a different hidden-suite variant with a rotating, never-named
 * held-back subset).
 *
 * ## The scheme
 *
 * Given a ticket's io-case-kind hidden-test ids:
 *
 *  1. **Held-back reserve** — a fixed fraction ({@link HELD_BACK_FRACTION}) of
 *     the pool is carved out, seeded ONLY by (ticketKey), never by user or
 *     attempt. This is CONTENT-LEVEL and PERMANENT: it is the same set for
 *     every learner and every attempt, forever, so no amount of re-attempting
 *     (even exhausting the whole submission budget) can ever surface it.
 *     "Never-named" in the spec means never named to the LEARNER; this
 *     module still returns it (as `heldBackCaseIds`) so the attempts service
 *     can log/audit it, and content authors can reason about it.
 *  2. **Per-attempt window** — the remaining "issuable" pool is permuted
 *     (seeded by (userId, ticketKey), so two learners see a different
 *     rotation and cannot share a "which subset is attempt #1" cheat sheet),
 *     then a cyclic window of that permutation is issued, sized so a single
 *     variant never reveals the WHOLE issuable pool at once when the pool is
 *     large enough to split. `attemptIndex` walks the window forward each
 *     re-attempt, so consecutive submissions sample different (though, once
 *     the window wraps, possibly overlapping) subsets — a learner cannot
 *     "fix just the one that failed last time" against a static set and
 *     systematically map the whole pool one case at a time.
 *
 * A tiny pool (0-2 cases) issues everything and holds nothing back: holding
 * back from a pool that small would leave too little to grade at all.
 *
 * `variantId` is a short, fully reproducible string derived from the exact
 * same seed as the selection, so the attempts service can cheaply re-derive
 * "what variantId WOULD attemptIndex N draw right now" and compare it
 * against what a client echoes back, as an optimistic-concurrency guard
 * against a stale/replayed attempt.
 */

import { createHash } from "node:crypto"

/** Fraction of a ticket's io-case pool that is never issued to any learner, ever. */
export const HELD_BACK_FRACTION = 1 / 3

export interface VariantSelection {
  variantId: string
  /** Hidden io-case ids issued for SCORING on this attempt. */
  issuedCaseIds: string[]
  /** Hidden io-case ids never issued on any attempt, for this ticket, to anyone. Content-level, not learner-facing. */
  heldBackCaseIds: string[]
}

/** First 4 bytes of sha256(seed) as an unsigned 32-bit integer — deterministic, no external RNG. */
function seededUint32(seed: string): number {
  return createHash("sha256").update(seed).digest().readUInt32BE(0)
}

/** Deterministic Fisher-Yates: re-hashes `${seed}:${i}` per step so the permutation is reproducible from the seed alone. */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = seededUint32(`${seed}:${i}`) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function selectHiddenVariant(
  ioCaseIds: readonly string[],
  userId: string,
  ticketKey: string,
  attemptIndex: number
): VariantSelection {
  const variantId = `v${attemptIndex}-${seededUint32(`${userId}:${ticketKey}:${attemptIndex}`).toString(36)}`

  if (ioCaseIds.length === 0) {
    return { variantId, issuedCaseIds: [], heldBackCaseIds: [] }
  }

  const sortedIds = [...ioCaseIds].sort()

  // Never hold back from a pool of 2 or fewer — nothing meaningful would be left to grade.
  const heldBackCount =
    sortedIds.length <= 2
      ? 0
      : Math.min(Math.floor(sortedIds.length * HELD_BACK_FRACTION), sortedIds.length - 1)

  const contentPermutation = seededShuffle(sortedIds, `reserve:${ticketKey}`)
  const heldBack = new Set(contentPermutation.slice(0, heldBackCount))
  const heldBackCaseIds = [...heldBack].sort()

  const issuablePool = sortedIds.filter((id) => !heldBack.has(id))
  if (issuablePool.length === 0) {
    return { variantId, issuedCaseIds: [], heldBackCaseIds }
  }

  const variantSize =
    issuablePool.length <= 2 ? issuablePool.length : Math.ceil(issuablePool.length / 2)
  const userPermutation = seededShuffle(issuablePool, `${userId}:${ticketKey}`)

  const start = (attemptIndex * variantSize) % userPermutation.length
  const issued = new Set<string>()
  for (let i = 0; i < variantSize; i++) {
    issued.add(userPermutation[(start + i) % userPermutation.length])
  }

  return { variantId, issuedCaseIds: [...issued].sort(), heldBackCaseIds }
}
