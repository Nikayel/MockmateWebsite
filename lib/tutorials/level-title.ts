/**
 * Level-title formatting. Pure string work, no registry imports, so client components can use it.
 *
 * Authored level titles carry their own number ("Level 6: Cloud & Data Engineering Foundations",
 * "Level 1 — Python Fundamentals"), which is right for a level heading and wrong everywhere the
 * number is already being rendered: a chip that prints `Level {id}: {title}` reads
 * "Level 6: Level 6: Cloud & Data Engineering Foundations". Strip the prefix first.
 */

/** The authored "Level N:" / "Level N —" / "Level N -" prefix, if the title carries one. */
const LEVEL_PREFIX = /^Level\s+\d+\s*[:—–-]\s*/i

/** "Level 6: Cloud & Data Engineering Foundations" -> "Cloud & Data Engineering Foundations". */
export function levelSubject(levelTitle: string): string {
  return levelTitle.replace(LEVEL_PREFIX, "").trim()
}

/**
 * "Level 6: Cloud & Data Engineering Foundations", from any authored title, with or without its own
 * prefix. Use wherever the level number is rendered beside the title.
 */
export function levelLabel(levelId: number, levelTitle: string): string {
  return `Level ${levelId}: ${levelSubject(levelTitle)}`
}
