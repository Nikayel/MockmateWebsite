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
      "You've been dropped into a city's 911 dispatch center. When an emergency call comes in, a human dispatcher stares at a live map of responder units (ambulances, fire, police) and manually picks who to send. Under load they pick slowly and inconsistently, and the GPS positions they're trusting can be seconds to minutes stale. Leadership wants software that recommends the best responder for each incident, but \"best\" is exactly what nobody has pinned down.",
    task: "Across five milestones you'll scope what \"best responder\" actually means, decompose the dispatch workflow to find the real bottleneck, commit to a ranking contract that holds up under stale location data and concurrent assignment, then implement the recommender inside the existing dispatch codebase until the tests pass. Finally you'll defend your choices and grade yourself.",
  },
  whyThisCompany:
    "Palantir FDSE interviews open with a vague, real-world operational problem and watch how you scope it. This lab mirrors that: a messy 911 dispatch system where the constraints (stale GPS, concurrent assignment, and a fail-safe fallback) matter far more than the ranking algorithm itself.",
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
      "Dispatch reports the responder GPS feed is now delayed by ~30 seconds during peak load. Your recommender still trusts live coordinates. How does your ranking hold up when the closest unit on paper may already be blocks away, and what would you change to stay safe?",
  },
  milestones: [
    {
      kind: "clarify",
      title: "Clarify",
      purpose: "Pin down what “best responder” means before you rank anything.",
      guidance: {
        interviewerPrompt:
          "You're building a system to dispatch emergency units (police, fire, EMT) to 911 calls. There are 100+ units across the city, and today dispatchers pick who to send by hand, with sticky notes and a radio. Your job is to recommend which unit to send to each call. Before you design anything, what do you need to ask me, and what would you assume if I stayed quiet?",
        whatItTests:
          "Whether you scope an open problem before solving it: you pin down what 'best unit' means and who acts on the recommendation before proposing anything.",
        howToApproach: [
          "Nail down 'best' first: fastest to scene, best survival odds, or lowest cost? It can't stay undefined.",
          "Ask who acts on it: does a dispatcher confirm or override, or does it auto-dispatch? For a life-or-death call that reshapes everything.",
          "Pair every question with the assumption you'd run with if I stay silent.",
          "Flag the constraints that bind the design: stale GPS, one unit grabbed by two calls, no unit available.",
        ],
        whatGoodLooksLike: [
          "You turn 'best' into a measurable goal and say which calls come first.",
          "You ask who the user is before assuming full autonomy.",
          "Every open question carries a default assumption.",
        ],
        commonTrap:
          "Jumping to 'rank by distance' before defining what you're optimizing or who acts on it. Scope first, rank later.",
      },
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
      guidance: {
        interviewerPrompt:
          "Break this system into parts before we design. Split it into clean, non-overlapping pieces, name the core entities, and show how a unit moves between states. Which one piece is the software actually here to fix?",
        whatItTests:
          "Whether you carve an ambiguous system into clean, non-overlapping parts (MECE) and find the real bottleneck, instead of listing everything.",
        howToApproach: [
          "Split along inputs, logic, and outputs: calls and GPS coming in, ranking in the middle, a recommendation out. Clean seams keep it MECE.",
          "Name the entities (Incident, Responder, Assignment) with a one-line role each.",
          "Model the risky state machine: a unit goes available to assigned to en route to on scene. Ask what breaks a transition, like a call cancelled mid-route.",
          "Point at the one bottleneck: the manual human choice of who to send.",
        ],
        whatGoodLooksLike: [
          "Parts don't overlap and leave no gap.",
          "You model one entity's states and probe the messy transition.",
          "You name exactly one bottleneck and defend it.",
        ],
        commonTrap:
          "Dumping ten overlapping subproblems, or jumping to databases and queues. They grade clean seams and the one bottleneck, not infra.",
      },
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
      guidance: {
        interviewerPrompt:
          "Lock the contract for the recommender. Give me the signature, what goes in and out, who reads the output, and what it does when GPS is stale or two calls want the same unit. When I push on a choice, do you defend it or revise it?",
        whatItTests:
          "Whether you commit to a concrete contract and adapt it live as I add constraints, keeping it design-lite (data shapes and APIs, not databases).",
        howToApproach: [
          "Pin concrete types: recommendResponder(incident, units) returns a ranked list, each entry with an ETA and a reason.",
          "Say who reads it: a dispatcher who can confirm or override, not a silent auto-dispatch.",
          "Design the failure path first: stale GPS, no unit in range, two calls for one unit.",
          "When I push, defend by naming what the other option breaks, or revise.",
        ],
        whatGoodLooksLike: [
          "A signature a teammate could build from.",
          "An explicit fallback for stale data and no unit available.",
          "You adjust under a new constraint instead of defending a sunk choice.",
        ],
        commonTrap:
          "Polishing the ranking math while ignoring the fail-safe. Under stale GPS the 'closest' unit may be blocks away, and no degraded mode gets people hurt.",
      },
    },
    {
      kind: "build",
      title: "Build",
      purpose: "Implement the recommender inside the real codebase and get the tests green.",
      guidance: {
        interviewerPrompt:
          "Here's the real dispatch codebase, which you didn't write. Get the pre-written tests green. Before you edit, trace how a call flows through the code. Which line do you want to start with?",
        whatItTests:
          "Whether you get productive fast in unfamiliar code and your design survives real inputs. The tests are given; the grade is your process.",
        howToApproach: [
          "Read before you type: trace one call and find where the recommender plugs in.",
          "Run the failing tests first; they're the contract.",
          "Build only the contract you designed, then handle the degraded inputs the tests probe.",
          "Narrate your reasoning and reconcile any drift from your design out loud.",
        ],
        whatGoodLooksLike: [
          "You edit the right files and leave the read-only reference alone.",
          "Ranking and fallback behave the way your design promised.",
          "You read each failing test as a signal, not a panic.",
        ],
        commonTrap:
          "Editing before you understand the flow, so a test you didn't expect turns red and you can't say why. Read first, change small.",
      },
    },
    {
      kind: "review",
      title: "Review",
      purpose: "Defend your choices against the curveballs, then grade yourself.",
      guidance: {
        interviewerPrompt:
          "Grade yourself 1 to 5 on the rubric I use: handling ambiguity, decomposition, design, code correctness, communication. Then the part every hiring manager asks: who does this tool help, who could it hurt if you got it wrong, and which one moment would you redo?",
        whatItTests:
          "Whether you grade yourself honestly and speak to the mission. The gap between your score and mine is the signal, and 'it was an interesting problem' doesn't land here.",
        howToApproach: [
          "Commit to a real number on each before you see my grade.",
          "Tie each score to a moment, not a mood.",
          "Answer the human question straight: name who it serves and the failure that hurts someone.",
          "Leave with one drillable next action, not 'communicate better.'",
        ],
        whatGoodLooksLike: [
          "Self-scores that track the transcript, not a flat row of 5s.",
          "You name a weak moment before I ask.",
          "You read the score gap as data, not something to argue back.",
        ],
        commonTrap:
          "Rating yourself a 5 across the board, or answering 'why this matters' with 'it's a fun challenge.' Both read as low self-awareness or a mercenary.",
      },
    },
  ],
}
