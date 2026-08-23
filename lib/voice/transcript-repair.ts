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
  // Canonical spellings.
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
  // Mis-hearings observed in real sessions. The letter "n" spoken mid-phrase is
  // routinely heard as "and", and "log n" as the far more common word "log in"
  // or "login". A 2026-08-22 interview produced "o off and log in" for
  // "O of n log n" and "off login" for "O of log n", neither of which any
  // keyterm can fix: every word in them is ordinary English the model is
  // confident about. They are only safe to rewrite because this alternation
  // fires exclusively INSIDE the Big-O pattern below, so "and" is rewritten to
  // "n" after an "O of", never in open prose. Longest bodies stay first or a
  // shorter one strands the rest of the phrase outside the parentheses.
  ["and log in", "n log n"],
  ["and log n", "n log n"],
  ["n log in", "n log n"],
  ["and squared", "n^2"],
  ["and cubed", "n^3"],
  ["and factorial", "n!"],
  ["log in", "log n"],
  ["login", "log n"],
  ["n", "n"],
  ["m", "m"],
  ["k", "k"],
  ["and", "n"],
]

const SPOKEN_TO_WRITTEN = new Map(
  COMPLEXITY_BODIES.map(([spoken, written]) => [spoken.toLowerCase(), written])
)

/**
 * Matches "O of <body>", with or without a leading "big", and with Deepgram's
 * common "oh" spelling of the letter.
 *
 * "of" is also accepted as "off", which is what the transcriber produces when
 * the speaker runs "O of" together.
 *
 * The leading \b is what keeps this from firing inside words: without it,
 * "ratio of n" would match on the trailing "o" of "ratio".
 */
const BIG_O_PATTERN = new RegExp(
  `\\b(?:big\\s+)?o(?:h)?\\s+of{1,2}\\s+(${COMPLEXITY_BODIES.map(([spoken]) =>
    spoken.replace(/\s+/g, "\\s+")
  ).join("|")})\\b`,
  "gi"
)

/**
 * "O of" spoken quickly collapses into the single word "off", leaving no "o"
 * token for BIG_O_PATTERN to anchor on: "O of log n" arrives as "off login".
 *
 * A bare "off" prefix is far too greedy to allow against the full body list -
 * "off and on" would become "O(n) on" and "kick off one" would become
 * "kick O(1)". So this second pattern accepts only bodies that carry a "log",
 * which no ordinary sentence puts after the word "off". Everything else must
 * still spell the letter out and go through BIG_O_PATTERN. This misses some
 * real cases on purpose; the alternative corrupts the transcript that feeds the
 * interviewer and the scorer.
 */
const COLLAPSED_O_BODIES: ReadonlyArray<readonly [spoken: string, written: string]> = [
  ["and log in", "n log n"],
  ["and log n", "n log n"],
  ["n log in", "n log n"],
  ["n log n", "n log n"],
  ["log log n", "log log n"],
  ["log in", "log n"],
  ["login", "log n"],
  ["log n", "log n"],
]

const COLLAPSED_TO_WRITTEN = new Map(
  COLLAPSED_O_BODIES.map(([spoken, written]) => [spoken.toLowerCase(), written])
)

const COLLAPSED_O_PATTERN = new RegExp(
  `\\boff\\s+(${COLLAPSED_O_BODIES.map(([spoken]) => spoken.replace(/\s+/g, "\\s+")).join("|")})\\b`,
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

  // After BIG_O_PATTERN, so an explicit "o off log n" is consumed by the
  // stricter rule first and never reaches this looser one.
  repaired = repaired.replace(COLLAPSED_O_PATTERN, (_match, body: string) => {
    const written = COLLAPSED_TO_WRITTEN.get(body.toLowerCase().replace(/\s+/g, " "))
    return written ? `O(${written})` : _match
  })

  for (const [pattern, replacement] of PHRASE_REPAIRS) {
    repaired = repaired.replace(pattern, replacement)
  }

  return repaired
}
