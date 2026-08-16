/**
 * Spelling and punctuation guard over the System Design and Python curriculum sources.
 *
 * The 2026-08-16 curriculum audit found 153 British spellings in learner-facing strings across 23
 * files (`behaviour` 54, `colour` 13, `neighbour` 8, and a long tail), and found that nothing in the
 * suite watched for them: `lesson-content-hygiene.test.ts` checks titles, summaries, ids and fences,
 * and no test anywhere checked spelling or em dashes on lesson prose. CLAUDE.md's rule is that a
 * convention worth keeping is enforced by a test rather than by a document, so this is that test.
 *
 * ## Shrink-only, because the sweep is still running
 *
 * The corpus CONTAINS violations right now and concurrent agents are removing them file by file. A
 * guard that demanded zero today would be red today, and a red guard gets switched off. So each file
 * carries a recorded baseline and the assertion is `count <= baseline`: a fix lowers the count and
 * stays green, a regression raises it and fails. **A file with no baseline entry must be at zero**,
 * which is what makes a newly authored lesson start clean.
 *
 * The baselines are a ratchet, not a budget. When the spelling sweep lands, recompute them and lower
 * the map in the same commit. An entry that stays high forever is a hole in the guard for that one
 * file, since a count-based baseline cannot tell a fixed instance plus a new one from no change.
 *
 * ## Why this reads files rather than walking the catalog
 *
 * Two reasons. The baseline has to be per-file to be actionable and to partition cleanly across fix
 * agents, and the catalog view has no file. And comments must be excluded rather than merely
 * unmatched: every one of the 13 em dashes in these trees is in a file-header JSDoc block, none is
 * in learner-facing prose, and a guard that could not tell those apart would have to be written as a
 * report instead of an assertion. {@link codeWithoutComments} is the same stripper
 * `lib/email/__tests__/email-content-guard.test.ts` uses, for the same reason and with the same
 * deliberate limit: only block comments and WHOLE-LINE `//` comments are stripped, because these
 * files are full of `https://` inside strings and an inline `//` strip would truncate them.
 */
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"

const ROOT = process.cwd()

/**
 * The two registries in scope: System Design and Python. The Data Engineering (SQL) tree is
 * deliberately out of scope, because it was not audited in this pass and a baseline nobody measured
 * is a number nobody can defend.
 */
const SCANNED_ROOTS = ["lib/tutorials/system-design", "lib/tutorials/curriculum"] as const

/**
 * Every authored `.ts` file under the scanned roots, tests excluded.
 *
 * Discovered rather than listed, so a lesson file added by the concurrent authoring loop is covered
 * the moment it lands instead of the next time somebody remembers this file exists. AppleDouble
 * sidecars (`._name.ts`) are skipped: this volume produces them and they are not source.
 */
function scannedFiles(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "__tests__" || name.startsWith("._")) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith(".ts")) found.push(relative(ROOT, full).split(sep).join("/"))
    }
  }
  for (const root of SCANNED_ROOTS) walk(join(ROOT, root))
  return found.sort()
}

const FILES = scannedFiles()

/**
 * Strip comments so the guard reads learner-facing strings and not the prose we write to each other.
 *
 * Whole-line `//` only, never inline: these files carry `https://` inside teach markdown and starter
 * code, and an inline strip would cut every one of those lines at the scheme, silently blinding the
 * scan on the rest of the line. Copied from the email content guard, which learned this the same way.
 */
function codeWithoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "")
}

/**
 * Strings that look British but are exercise CONTRACTS, not prose.
 *
 * Both are graded: the learner's code has to produce the exact identifier or the exact literal, and
 * the same spelling appears in the prompt, the starter, the reference solution and the tests. A
 * find-and-replace that touches one and not the others breaks the exercise, so these are exempted
 * here and left alone rather than half-renamed. Renaming either one consistently, in a single
 * commit across all of its call sites, is a legitimate future change: the exemption simply stops
 * matching and the file's count drops.
 */
const CONTRACT_EXEMPTIONS: ReadonlyArray<{ file: string; pattern: RegExp; why: string }> = [
  {
    file: "lib/tutorials/curriculum/level3/pytest-basics.ts",
    pattern: /wrong_behaviours/g,
    why: 'graded function name: the prompt states `wrong_behaviours("correct")` is `[]`, and the starter, reference and tests all define it',
  },
  {
    file: "lib/tutorials/curriculum/level5/index.ts",
    pattern: /"summarise"/g,
    why: 'graded prompt literal: the L5 retry exercise calls model.complete("summarise") and the scripted FlakyModel is keyed on that exact string',
  },
]

/** One file's text as this guard sees it: comments gone, exercise contracts redacted. */
function scannableText(file: string): string {
  let text = codeWithoutComments(readFileSync(join(ROOT, file), "utf8"))
  for (const exemption of CONTRACT_EXEMPTIONS) {
    if (exemption.file === file) text = text.replace(exemption.pattern, "<contract>")
  }
  return text
}

/**
 * The `-ise` verb family. Stems only, so every inflection is covered by one entry.
 *
 * A `[a-z]*` prefix is allowed so `unrecognised`, `reorganised` and `deserialise` are caught; the
 * suffix list is closed so a stem cannot match a word that merely starts with it.
 */
const ISE_STEMS = [
  "optimis",
  "organis",
  "recognis",
  "normalis",
  "serialis",
  "initialis",
  "materialis",
  "memoris",
  "summaris",
  "generalis",
  "categoris",
  "prioritis",
  "utilis",
  "amortis",
] as const

/**
 * The audited word families, each with the American spelling that replaces it.
 *
 * This is the set the 2026-08-16 audit measured across both registries. It is append-only: adding a
 * family is fine and only ever adds baseline entries, but nothing may be removed without a reason
 * written next to the deletion.
 */
const BRITISH_PATTERNS: ReadonlyArray<{ american: string; pattern: RegExp }> = [
  { american: "behavior", pattern: /behaviour/gi },
  { american: "color", pattern: /colour/gi },
  { american: "license", pattern: /licence/gi },
  {
    american: "-ize",
    pattern: new RegExp(
      `[a-z]*(?:${ISE_STEMS.join("|")})(?:e|es|ed|ing|er|ers|ation|ations|abl[ey])\\b`,
      "gi"
    ),
  },
  /**
   * `analyse` and its inflections, with `analyses` and `analysis` deliberately NOT matched.
   * "analyses" is the American plural of "analysis" as well as the British verb form, so matching it
   * would fail correct prose; "analysis" is correct American English outright.
   */
  { american: "analyze", pattern: /[a-z]*analys(?:e|ed|ing|er|ers)\b/gi },
  { american: "practice", pattern: /[a-z]*practis(?:e|es|ed|ing)\b/gi },
  { american: "honor", pattern: /honour/gi },
  { american: "favor", pattern: /favour/gi },
  { american: "neighbor", pattern: /neighbour/gi },
  /**
   * The unit word only. `parameter`, `diameter` and `perimeter` end in "meter", never "metre", so
   * the American spelling of the unit is the only thing this can collide with, and that is the
   * spelling we want.
   */
  { american: "meter", pattern: /\b(?:kilo|centi|milli|micro|nano)?metres?\b/gi },
  { american: "judgment", pattern: /judgement/gi },
  { american: "aging", pattern: /\bageing\b/gi },
  { american: "while", pattern: /\bwhilst\b/gi },
  { american: "among", pattern: /\bamongst\b/gi },
]

/** Banned as prose punctuation everywhere a learner can read it (CLAUDE.md). Use a comma or a period. */
const EM_DASH = /—/g

/** Every British spelling in one body of text, in source order. */
function britishSpellings(text: string): string[] {
  const found: string[] = []
  for (const { pattern } of BRITISH_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) found.push(match[0])
  }
  return found
}

/** Every em dash in one body of text. */
function emDashes(text: string): string[] {
  return text.match(EM_DASH) ?? []
}

/**
 * British spellings per file as measured on 2026-08-16, AFTER comment stripping and after the
 * contract exemptions above. A ratchet: every file may only ever go down, and a file absent from
 * this map must be at zero.
 *
 * These are the audit's HIGH-WATER MARK, not a live reading. The fix wave was running as this was
 * written and five of the files below went to zero between the census and the commit, which is the
 * mechanism working as intended: a count that has already fallen is still under its baseline, and a
 * fix that has to be reverted does not turn the guard red on its way back.
 *
 * Recompute and lower these when the spelling sweep lands. `lib/tutorials/curriculum/level3/cli.ts`
 * and `level4/config-logging.ts` will not reach zero by a copy edit alone: their hits are `--colour`
 * and `{"colour": "red"}`, deliberate not-in-the-spec tokens the graded assertions match on, so
 * changing them means changing the exercise contract in one commit across prompt, starter,
 * reference and tests.
 */
const BRITISH_BASELINE: ReadonlyMap<string, number> = new Map([
  ["lib/tutorials/curriculum/level1/index.ts", 5],
  ["lib/tutorials/curriculum/level2/index.ts", 44],
  ["lib/tutorials/curriculum/level3/cli.ts", 8],
  ["lib/tutorials/curriculum/level3/logging-errors.ts", 1],
  ["lib/tutorials/curriculum/level3/numpy-arrays.ts", 1],
  ["lib/tutorials/curriculum/level3/packages.ts", 5],
  ["lib/tutorials/curriculum/level3/pandas-dataframes.ts", 2],
  ["lib/tutorials/curriculum/level3/parse-config.ts", 2],
  ["lib/tutorials/curriculum/level3/pytest-basics.ts", 21],
  ["lib/tutorials/curriculum/level3/rest-pydantic.ts", 1],
  ["lib/tutorials/curriculum/level3/type-hints.ts", 2],
  ["lib/tutorials/curriculum/level4/abc-protocols.ts", 1],
  ["lib/tutorials/curriculum/level4/concurrency.ts", 4],
  ["lib/tutorials/curriculum/level4/config-logging.ts", 5],
  ["lib/tutorials/curriculum/level4/packaging-capstone.ts", 1],
  ["lib/tutorials/curriculum/level4/performance.ts", 1],
  ["lib/tutorials/curriculum/level4/solid-patterns.ts", 2],
  ["lib/tutorials/curriculum/level5/index.ts", 10],
  ["lib/tutorials/system-design/curriculum/level0.ts", 6],
  ["lib/tutorials/system-design/curriculum/level1.ts", 2],
  ["lib/tutorials/system-design/curriculum/level3.ts", 10],
  ["lib/tutorials/system-design/curriculum/level5.ts", 7],
  ["lib/tutorials/system-design/curriculum/level9.ts", 3],
])

/**
 * Em dashes per file, measured the same day and the same way. Empty on purpose.
 *
 * Every `—` in these two trees sits in a file-header JSDoc block, which no learner ever sees, so the
 * comment-stripped count is zero everywhere and the rule is effectively "none, anywhere". The map
 * exists anyway so that a future instance nobody can fix immediately can be RECORDED here instead of
 * being made a reason to weaken the assertion.
 */
const EM_DASH_BASELINE: ReadonlyMap<string, number> = new Map()

describe("curriculum prose conventions", () => {
  it("walks a real, non-empty file set across both registries", () => {
    // A loose floor, not a count: its job is to fail if the walk breaks and every assertion below
    // starts passing over an empty list.
    expect(FILES.length).toBeGreaterThan(40)
    expect(FILES.some((file) => file.startsWith("lib/tutorials/system-design/"))).toBe(true)
    expect(FILES.some((file) => file.startsWith("lib/tutorials/curriculum/"))).toBe(true)
  })

  it("keeps both baselines honest, so no entry can outlive its file", () => {
    // A baseline naming a file that no longer exists is an exemption nobody can revoke, and it hides
    // the fact that the file was renamed rather than fixed.
    const stale = [...BRITISH_BASELINE.keys(), ...EM_DASH_BASELINE.keys()].filter(
      (file) => !FILES.includes(file)
    )
    expect(stale).toEqual([])
  })

  it("keeps the contract exemptions honest, so no exemption can outlive its string", () => {
    // If a fix agent renames the identifier or the literal consistently, the exemption stops
    // matching and must be deleted rather than left as a standing licence.
    const unnecessary = CONTRACT_EXEMPTIONS.filter(({ file, pattern }) => {
      const source = codeWithoutComments(readFileSync(join(ROOT, file), "utf8"))
      pattern.lastIndex = 0
      return !pattern.test(source)
    }).map(({ file, pattern }) => `${file}: ${pattern} no longer matches`)
    expect(unnecessary).toEqual([])
  })

  it("never grows the count of British spellings in any file", () => {
    const offenders: string[] = []
    for (const file of FILES) {
      const found = britishSpellings(scannableText(file))
      const baseline = BRITISH_BASELINE.get(file) ?? 0
      if (found.length > baseline) {
        const sample = [...new Set(found)].slice(0, 8).join(", ")
        offenders.push(
          `${file}: ${found.length} British spellings, baseline ${baseline} (${sample})`
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it("never grows the count of em dashes in any file", () => {
    const offenders: string[] = []
    for (const file of FILES) {
      const found = emDashes(scannableText(file))
      const baseline = EM_DASH_BASELINE.get(file) ?? 0
      if (found.length > baseline) {
        offenders.push(`${file}: ${found.length} em dashes, baseline ${baseline}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("the rule rejects what it is meant to reject", () => {
  // Without this block both assertions above pass on a corpus that is already at its baseline and
  // would keep passing with either detector inverted. Every family gets a positive case, and every
  // near-miss that would force the guard to be switched off gets a negative one.

  it.each([
    ["behaviour", "The behaviour is documented."],
    ["behaviours", "Two behaviours survive the move."],
    ["behavioural", "A behavioural difference."],
    ["colour", "Pick a colour."],
    ["licence", "The licence file."],
    ["optimise", "Optimise the hot loop."],
    ["optimisation", "A premature optimisation."],
    ["organise", "Organise the modules."],
    ["recognises", "The parser recognises it."],
    ["recognisable", "A recognisable shape."],
    ["unrecognised", "An unrecognised flag."],
    ["normalise", "Normalise the payload."],
    ["serialised", "The value is serialised."],
    ["deserialise", "Then deserialise it."],
    ["initialised", "Already initialised."],
    ["materialises", "The row materialises."],
    ["memorise", "Do not memorise it."],
    ["summarise", "Summarise the log."],
    ["generalises", "The rule generalises."],
    ["categorise", "Categorise the errors."],
    ["prioritise", "Prioritise the queue."],
    ["utilisation", "CPU utilisation."],
    ["amortised", "O(1) amortised."],
    ["analyse", "Analyse the trace."],
    ["practise", "Practise the drill."],
    ["honour", "It will honour the timeout."],
    ["favour", "Favour the simpler shape."],
    ["neighbour", "Read the neighbour cell."],
    ["metres", "Fifty metres of cable."],
    ["kilometre", "One kilometre away."],
    ["judgement", "A judgement call."],
    ["ageing", "An ageing cache entry."],
    ["whilst", "Whilst the lock is held."],
    ["amongst", "Split amongst the shards."],
  ])("flags %s", (_word, sentence) => {
    expect(britishSpellings(sentence)).toHaveLength(1)
  })

  it.each([
    ["behavior", "The behavior is documented."],
    ["color", "Pick a color."],
    ["license", "The license file."],
    ["optimization", "A premature optimization."],
    ["serialized", "The value is serialized."],
    ["analysis", "The analysis holds."],
    ["analyses", "Both analyses agree, and the plural is American too."],
    ["parameter", "One parameter per column."],
    ["diameter", "The diameter of the ring."],
    ["perimeter", "Guard the perimeter."],
    ["meters", "Fifty meters of cable."],
    ["practice", "Practice the drill."],
    ["judgment", "A judgment call."],
    ["aging", "An aging cache entry."],
    ["while", "While the lock is held."],
    ["among", "Split among the shards."],
  ])("leaves %s alone", (_word, sentence) => {
    expect(britishSpellings(sentence)).toEqual([])
  })

  it("counts every hit on a line, not just the first", () => {
    // Three of the audited lines carry two hits each. A detector that stopped at the first match per
    // line would report the sweep as finished with a third of it left.
    expect(britishSpellings("recognised and recognise on one line")).toHaveLength(2)
  })

  it("flags an em dash and leaves a hyphen, en dash and middle dot alone", () => {
    // The en dash is a legitimate range mark and the middle dot is the sources-block separator, so
    // widening this to every dash would fail correct content.
    expect(emDashes("a — b")).toHaveLength(1)
    expect(emDashes("a - b, 3–5 rows, one · two")).toEqual([])
  })

  it("does not read file comments", () => {
    // The whole reason the em-dash baseline is empty: every em dash in these trees is in a header
    // JSDoc block. If the stripper ever stops working this goes red instead of the baseline growing.
    const source = '/**\n * Level 0 — the method.\n */\nexport const S = "fine"\n'
    expect(emDashes(codeWithoutComments(source))).toEqual([])
    expect(
      britishSpellings(codeWithoutComments("// documents the behaviour rule\nconst a = 1\n"))
    ).toEqual([])
  })

  it("still reads a string that sits next to a comment", () => {
    // The stripper is deliberately narrow. An inline `//` is left alone because these files are full
    // of https:// inside strings, so a string on a commented line must still be scanned.
    expect(britishSpellings(codeWithoutComments('const a = "behaviour" // note\n'))).toHaveLength(1)
  })

  it("redacts an exempted contract string without blinding the rest of the file", () => {
    // The exemption is a redaction of one literal, not an exemption of the file.
    const text = 'def wrong_behaviours(build): ...\n"""Documents the behaviour."""\n'
    const redacted = text.replace(CONTRACT_EXEMPTIONS[0].pattern, "<contract>")
    expect(britishSpellings(text)).toHaveLength(2)
    expect(britishSpellings(redacted)).toHaveLength(1)
  })
})
