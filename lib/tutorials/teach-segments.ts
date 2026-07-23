/**
 * Auto-segmentation for long teach markdown — the player-level half of the
 * progressive-disclosure plan (INTERACTIVITY-PLAN.md, Iteration 3).
 *
 * A teach over ~500 words is split on H2/H3 boundaries into 2-4 learner-advanced
 * segments; the SystemDesignLessonPlayer reveals them one Continue at a time with the
 * position persisted per lesson. Splitting NEVER changes content or lesson count — it
 * only paces the same markdown — so all ~208 lessons benefit with zero re-authoring.
 *
 * Rules:
 *  - Pure and deterministic: same markdown in, same segments out (CI-friendly).
 *  - Split points are H2/H3 heading lines OUTSIDE code fences only, so an ascii
 *    diagram, csdiagram, or cswidget block can never be torn from its paragraph.
 *  - Chunks between headings are merged proportionally into at most 4 segments of
 *    roughly equal word mass; a tiny trailing chunk (the recap + cumulative check)
 *    merges into its predecessor instead of standing alone.
 *  - Joining the segments reproduces the input exactly (modulo nothing: we split on
 *    line boundaries and keep every line), which the tests assert.
 */

/** Teaches at or under this word count render unsegmented. */
const WORD_THRESHOLD = 500
const MAX_SEGMENTS = 4
const MIN_SEGMENTS = 2
/** Aim for segments of very roughly this many words when choosing the segment count. */
const TARGET_SEGMENT_WORDS = 400
/** A final segment under this many words merges back into its predecessor. */
const MIN_TAIL_WORDS = 120

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/)
  return words[0] === "" ? 0 : words.length
}

/** Lines grouped into chunks that start at fence-aware H2/H3 headings. */
function chunkAtHeadings(markdown: string): string[] {
  const lines = markdown.split("\n")
  const chunks: string[][] = [[]]
  let inFence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      chunks[chunks.length - 1].push(line)
      continue
    }
    if (!inFence && /^#{2,3} /.test(line) && chunks[chunks.length - 1].length > 0) {
      chunks.push([line])
      continue
    }
    chunks[chunks.length - 1].push(line)
  }
  return chunks.filter((c) => c.length > 0).map((c) => c.join("\n"))
}

/**
 * Split a teach markdown into 1-4 progressive segments. Returns a single-element
 * array (the whole teach) when the content is short or has no usable split points.
 */
export function segmentTeachMarkdown(markdown: string): string[] {
  const total = wordCount(markdown)
  if (total <= WORD_THRESHOLD) return [markdown]

  const chunks = chunkAtHeadings(markdown)
  if (chunks.length < 2) return [markdown]

  const targetCount = Math.min(
    MAX_SEGMENTS,
    Math.max(MIN_SEGMENTS, Math.round(total / TARGET_SEGMENT_WORDS)),
    chunks.length
  )

  // Greedy proportional packing: close a segment once it carries its share of the
  // words, keeping enough chunks in reserve for the remaining segments.
  const counts = chunks.map(wordCount)
  const segments: string[] = []
  let current: string[] = []
  let currentWords = 0
  let remainingWords = total
  for (let i = 0; i < chunks.length; i++) {
    current.push(chunks[i])
    currentWords += counts[i]
    const segmentsLeft = targetCount - segments.length
    const chunksLeft = chunks.length - i - 1
    const share = remainingWords / segmentsLeft
    if (
      segments.length < targetCount - 1 &&
      currentWords >= share * 0.75 &&
      chunksLeft >= segmentsLeft - 1
    ) {
      segments.push(current.join("\n"))
      remainingWords -= currentWords
      current = []
      currentWords = 0
    }
  }
  if (current.length > 0) segments.push(current.join("\n"))

  // A stub tail (short recap) reads better attached to its predecessor.
  if (segments.length > 1 && wordCount(segments[segments.length - 1]) < MIN_TAIL_WORDS) {
    const tail = segments.pop()!
    segments[segments.length - 1] = segments[segments.length - 1] + "\n" + tail
  }

  return segments.length >= 2 ? segments : [markdown]
}

/** The localStorage key the player persists the revealed-segment count under. */
export function teachSegmentStorageKey(lessonId: string): string {
  return `cs_sd_seg_${lessonId}`
}
