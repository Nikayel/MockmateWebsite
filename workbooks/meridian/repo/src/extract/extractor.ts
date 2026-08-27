import type { ExtractedFields } from "./schema"

const AMOUNT_PATTERN = /amount:\s*\$?([\d,]+\.\d{2})/i
const CLAIMANT_PATTERN = /claimant:\s*([A-Za-z .'-]+)/i
const LOSS_DATE_PATTERN = /loss date:\s*(\d{4}-\d{2}-\d{2})/i

/**
 * Pulls fields out of a document's raw text with regular expressions. Nothing here
 * understands the document - it is pattern matching against a handful of fixed labels, until
 * a model call replaces it.
 */
export function extractFields(documentText: string): ExtractedFields {
  const amountMatch = documentText.match(AMOUNT_PATTERN)
  const claimantMatch = documentText.match(CLAIMANT_PATTERN)
  const lossDateMatch = documentText.match(LOSS_DATE_PATTERN)

  return {
    claimAmount: amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : null,
    claimantName: claimantMatch ? claimantMatch[1].trim() : null,
    lossDate: lossDateMatch ? lossDateMatch[1] : null,
  }
}
