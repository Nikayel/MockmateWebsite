import type { InterviewSession } from "@/lib/types"
import type { Scenario } from "@/lib/scenarios/types"
import { getScenarioLanguages } from "@/lib/scenarios/languages"
import { EDITOR_LANGUAGES } from "@/lib/interview/languages"
import { formatPatternLabel } from "@/lib/pattern-labels"
import { getNextPracticeFocus } from "./next-practice-focus"
import type { NextPracticeRecommendation } from "./next-practice-types"

const DIFFICULTY = { easy: 0, medium: 1, hard: 2 } as const

function supportsInterview(scenario: Scenario): boolean {
  const language =
    scenario.workspace?.language ??
    (scenario.type === "bugfix" ? scenario.pack?.language : undefined)
  return !language || EDITOR_LANGUAGES.some((supported) => supported === language)
}

function evidenceSkillMatch(session: InterviewSession, candidate: Scenario): number {
  if (session.type !== "bugfix" || candidate.type !== "bugfix") return 0
  const evidence = session.bugfix_evidence_summary
  const skill =
    evidence?.reproducedBeforeEditing === false
      ? "reproduc"
      : evidence?.rootCauseExplained === false
        ? "root cause"
        : undefined
  return skill && candidate.debuggingSkills?.some((value) => value.toLowerCase().includes(skill))
    ? 1
    : 0
}

function supportsLanguage(scenario: Scenario, language?: string): boolean {
  if (!language || scenario.type === "system-design") return true
  if (scenario.workspace) return scenario.workspace.language === language
  if (scenario.type === "bugfix" && scenario.pack) return scenario.pack.language === language
  if (scenario.type === "dsa") return Boolean(scenario.starterCode[language])
  return getScenarioLanguages(scenario).some((supported) => supported === language)
}

function topicMatch(current: Scenario, candidate: Scenario): number {
  if (current.type === "dsa" && candidate.type === "dsa") {
    return current.pattern === candidate.pattern ? 100 : 0
  }
  const skills = new Set(
    [...current.tags, ...(current.type === "bugfix" ? (current.debuggingSkills ?? []) : [])].map(
      (skill) => skill.toLowerCase()
    )
  )
  const candidateSkills = new Set(
    [
      ...candidate.tags,
      ...(candidate.type === "bugfix" ? (candidate.debuggingSkills ?? []) : []),
    ].map((skill) => skill.toLowerCase())
  )
  return [...candidateSkills].filter((skill) => skills.has(skill)).length
}

/**
 * A conservative post-feedback transfer task, not a due-review scheduler.
 * Hard constraints run before ranking. History is bounded by the caller, so the UI
 * promises a different task, never "a problem you have never solved".
 */
export function selectNextPractice(
  session: InterviewSession,
  catalog: readonly Scenario[],
  recentScenarioIds: readonly string[] = []
): NextPracticeRecommendation | null {
  const legacyMatches = session.scenario_id
    ? []
    : catalog.filter(
        (scenario) => scenario.title === session.topic && scenario.type === session.type
      )
  const current = session.scenario_id
    ? catalog.find((scenario) => scenario.id === session.scenario_id)
    : legacyMatches.length === 1
      ? legacyMatches[0]
      : undefined
  if (!current || (session.type && session.type !== current.type)) return null

  const language = session.language ?? session.session_state?.language
  const excluded = new Set([...recentScenarioIds, current.id])
  const currentDifficulty = DIFFICULTY[current.difficulty]
  const score = [session.technical_score, session.mastery_score, session.performance_score].find(
    (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
  )
  const targetDifficulty =
    typeof score === "number" && score < 55 ? Math.max(0, currentDifficulty - 1) : currentDifficulty
  const candidates = catalog.filter(
    (candidate) =>
      candidate.type === current.type &&
      !excluded.has(candidate.id) &&
      DIFFICULTY[candidate.difficulty] <= currentDifficulty &&
      supportsInterview(candidate) &&
      supportsLanguage(candidate, language) &&
      (candidate.type !== "bugfix" || candidate.bugfixKind !== "micro-debugging")
  )
  // Keep the DSA pattern when it exists in the eligible pool; lexical similarity
  // must never push an unrelated graph problem ahead of the array skill just practiced.
  const matching = candidates.filter((candidate) => topicMatch(current, candidate) > 0)
  // A different DSA pattern does not practice the skill just assessed.
  const pool = current.type === "dsa" || matching.length ? matching : candidates
  const ranked = [...pool].sort(
    (a, b) =>
      evidenceSkillMatch(session, b) - evidenceSkillMatch(session, a) ||
      Math.abs(DIFFICULTY[a.difficulty] - targetDifficulty) -
        Math.abs(DIFFICULTY[b.difficulty] - targetDifficulty) ||
      topicMatch(current, b) - topicMatch(current, a) ||
      a.estimatedTime - b.estimatedTime ||
      a.id.localeCompare(b.id)
  )
  const next = ranked[0]
  if (!next) return null

  const samePattern =
    current.type === "dsa" && next.type === "dsa" && current.pattern === next.pattern
  const reason = samePattern
    ? `Practice ${formatPatternLabel(current.pattern)} with a different problem.`
    : topicMatch(current, next) > 0
      ? "A different problem with topics in common with this session."
      : "A different problem in the same interview track, at your current difficulty or below."
  return {
    scenarioId: next.id,
    title: next.title,
    type: next.type,
    difficulty: next.difficulty,
    estimatedMinutes: next.estimatedTime,
    href: `/interview?scenario=${encodeURIComponent(next.id)}&source=next-practice&fromSession=${encodeURIComponent(session.id)}${language && next.type !== "system-design" ? `&language=${encodeURIComponent(language)}` : ""}`,
    reason,
    ...getNextPracticeFocus(session),
  }
}
