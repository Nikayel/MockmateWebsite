/**
 * Deterministic repairs for interview speech Deepgram reliably mis-transcribes.
 *
 * Keyterm prompting (interview-keyterms.ts) raises the odds for rare words, but
 * it cannot help when the mis-hearing IS a common word. A candidate saying
 * "O of n" produces "on": the model is confident, the output is valid English,
 * and no vocabulary hint outranks it. The same goes for "four loop".
 *
 * So these phrases are repaired after transcription instead. Every rule here is
 * anchored on word boundaries and must be idempotent - transcripts pass through
 * this function repeatedly as interim results arrive, so applying a rule twice
 * has to produce the same string as applying it once.
 *
 * Adding a rule: add the pair, then add a test. A rule that fires on ordinary
 * speech corrupts the transcript that feeds the AI interviewer and scoring, so
 * prefer a narrow rule that misses some cases over a broad one that overreaches.
 */

/**
 * Spoken complexity expressions mapped to their written form.
 *
 * Order matters: the alternation is tried left to right, so longer bodies must
 * come first or "n log n" would match the bare "n" rule and leave "log n"
 * stranded outside the parentheses.
 */
const COMPLEXITY_BODIES: ReadonlyArray<readonly [spoken: string, written: string]> = [
  ["n log n", "n log n"],
  ["log log n", "log log n"],
  ["log n", "log n"],
  ["n squared", "n^2"],
  ["n cubed", "n^3"],
  ["n factorial", "n!"],
  ["two to the n", "2^n"],
  ["v plus e", "V + E"],
  ["n plus m", "n + m"],
  ["m plus n", "m + n"],
  ["n times m", "n * m"],
  ["one", "1"],
  ["n", "n"],
  ["m", "m"],
  ["k", "k"],
]

const SPOKEN_TO_WRITTEN = new Map(
  COMPLEXITY_BODIES.map(([spoken, written]) => [spoken.toLowerCase(), written])
)

/**
 * Matches "O of <body>", with or without a leading "big", and with Deepgram's
 * common "oh" spelling of the letter.
 *
 * The leading \b is what keeps this from firing inside words: without it,
 * "ratio of n" would match on the trailing "o" of "ratio".
 */
const BIG_O_PATTERN = new RegExp(
  `\\b(?:big\\s+)?o(?:h)?\\s+of\\s+(${COMPLEXITY_BODIES.map(([spoken]) =>
    spoken.replace(/\s+/g, "\\s+")
  ).join("|")})\\b`,
  "gi"
)

/**
 * Straightforward phrase substitutions. Kept deliberately short: each entry is
 * a phrase confirmed to be mis-transcribed in interviews, not a guess.
 */
const PHRASE_REPAIRS: ReadonlyArray<readonly [RegExp, string]> = [
  // "for loop" is heard as the number four often enough to be worth fixing.
  [/\bfour\s+loop\b/gi, "for loop"],
  [/\bfour\s+each\s+loop\b/gi, "for each loop"],
  // "big oh" is a spelling of the letter, not a word.
  [/\bbig\s+oh\b(?!\s+of\s)/gi, "big O"],
]

/**
 * Repair the interview phrases Deepgram reliably gets wrong.
 *
 * Idempotent: repairing already-repaired text returns it unchanged.
 */
export function repairInterviewTranscript(text: string): string {
  if (!text) return text

  let repaired = text.replace(BIG_O_PATTERN, (_match, body: string) => {
    // Deepgram may put any casing or spacing on the spoken body, so normalize
    // before looking it up rather than trying to encode every variant above.
    const written = SPOKEN_TO_WRITTEN.get(body.toLowerCase().replace(/\s+/g, " "))
    return written ? `O(${written})` : _match
  })

  for (const [pattern, replacement] of PHRASE_REPAIRS) {
    repaired = repaired.replace(pattern, replacement)
  }

  return repaired
}
