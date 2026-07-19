// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `function findAdjustmentPair(lineItems, targetCents) {
  const seenAmounts = new Map();

  for (let index = 0; index < lineItems.length; index += 1) {
    const row = lineItems[index];

    if (typeof row.amountCents !== "number" || row.status !== "open") {
      continue;
    }

    const needed = targetCents - row.amountCents;

    if (seenAmounts.has(needed)) {
      return [seenAmounts.get(needed), index];
    }

    seenAmounts.set(row.amountCents, index);
  }

  return [];
}

module.exports = { findAdjustmentPair };
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-onboarding",
  bugDescription:
    "The open-status guard is applied only when caching a row, not when the current row completes a pair, so a reconciled row can still match against a previously cached open row and explain an adjustment with settled money.",
  groundTruth:
    "Root cause: the status filter is one-sided. Rows are cached only when open, but the match branch runs before any status check, so a reconciled row encountered later can complete a pair with a cached open row. Fix: skip rows that are not open before both the match and the cache, alongside the existing missing-amount skip. Red herrings, all provably innocent: (1) summarizeAdjustment's null guards in src/ledger.js look like they could swallow valid pairs, but they only reject malformed pairs and identical indexes; (2) the seenAmounts overwrite on duplicate amounts looks lossy, but any cached index with that amount satisfies the first-completing-pair contract; (3) negative credit amounts look risky, but integer cent arithmetic over negatives is exact and the contract allows credits in pairs.",
  rootCauseRubric: [
    "Identifies that the status guard covers only the caching side of the scan, not the row that completes the pair.",
    "Connects the false explanation to double-counting settled money in the ledger, not just to a failing test.",
    "Rules out the ledger helper and the duplicate-amount overwrite with evidence instead of rewriting them.",
    "Names a regression guard such as a reconciled-complement test case or status filtering at ingestion.",
  ],
  referenceFiles: [
    {
      path: "src/reconciliation.js",
      role: "editable",
      language: "javascript",
      content: reference,
    },
  ],
}
