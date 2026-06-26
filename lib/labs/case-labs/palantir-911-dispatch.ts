/**
 * Palantir — 911 Dispatch Optimization Case Lab.
 *
 * Ported from the open workbook (lab_01_911_dispatch): map the Clarify /
 * Decompose / Design / Review content into a `CaseLab`, and reshape the Build
 * into a multi-file codebase drop (see the `palantir-911-dispatch-build`
 * workspace scenario) — never a blank single-file DSA task (spec §1, §7.4).
 */

import type { CaseLab } from "@/lib/labs/types"

export const palantir911Dispatch: CaseLab = {
  id: "palantir-911-dispatch",
  title: "911 Dispatch Optimization",
  company: "palantir",
  role: "FDSE",
  difficulty: "medium",
  estimatedMinutes: 60,
  brief: {
    situation:
      "You've been dropped into a city's 911 dispatch center. When an emergency call comes in, a human dispatcher stares at a live map of responder units — ambulances, fire, police — and manually picks who to send. Under load they pick slowly and inconsistently, and the GPS positions they're trusting can be seconds to minutes stale. Leadership wants software that recommends the best responder for each incident — but \"best\" is exactly what nobody has pinned down.",
    task: 'Across five milestones you\'ll scope what "best responder" actually means, decompose the dispatch workflow to find the real bottleneck, commit to a ranking contract that holds up under stale location data and concurrent assignment, then implement the recommender inside the existing dispatch codebase until the tests pass — and finally defend your choices and grade yourself.',
  },
  whyThisCompany:
    "Palantir FDSE interviews open with a vague, real-world operational problem and watch how you scope it. This lab mirrors that: a messy 911 dispatch system where the constraints — stale GPS, concurrent assignment, and a fail-safe fallback — matter far more than the ranking algorithm itself.",
  skills: [
    "decomposition",
    "ranking under constraints",
    "stale / real-time data",
    "human-in-the-loop design",
  ],
  buildScenarioId: "palantir-911-dispatch-build",
  buildScenarioType: "add-functionality",
  buildCurveball: {
    title: "Curveball: the GPS feed just went stale",
    prompt:
      "Dispatch reports the responder GPS feed is now delayed by ~30 seconds during peak load. Your recommender still trusts live coordinates. How does your ranking hold up when the closest unit on paper may already be blocks away — and what would you change to stay safe?",
  },
  milestones: [
    {
      kind: "clarify",
      title: "Clarify",
      purpose: "Pin down what “best responder” means before you rank anything.",
      ghostExample: {
        dimension: "business-outcome",
        question: "Are we optimizing time-to-dispatch, fewer wrong dispatches, or cost?",
        assumption: "Optimize time-to-dispatch for high-severity, life-threatening calls first.",
      },
    },
    {
      kind: "decompose",
      title: "Decompose",
      purpose: "Map the dispatch workflow and name the single bottleneck.",
      ghostExample: {
        workflow: [
          "Call received and triaged",
          "Dispatcher scans a map for nearby units",
          "Dispatcher manually picks a responder",
        ],
        entities: [
          { name: "Incident", role: "an emergency that needs a responder" },
          { name: "Responder", role: "a unit that can be dispatched" },
        ],
      },
    },
    {
      kind: "design",
      title: "Design",
      purpose: "Commit to a ranking contract and defend it under stale data and concurrency.",
    },
    {
      kind: "build",
      title: "Build",
      purpose: "Implement the recommender inside the real codebase and get the tests green.",
    },
    {
      kind: "review",
      title: "Review",
      purpose: "Defend your choices against the curveballs, then grade yourself.",
    },
  ],
}
