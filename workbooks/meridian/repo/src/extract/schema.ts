/**
 * What the extractor is trying to pull out of a claim document. A field comes back `null`
 * when the extractor could not find it - never a guess, and never an empty string standing
 * in for "unknown".
 */
export interface ExtractedFields {
  /** Dollars, floating point - same representation as everywhere else in Meridian today. */
  claimAmount: number | null
  claimantName: string | null
  /** YYYY-MM-DD, matching `Claim.lossDate`. */
  lossDate: string | null
}
