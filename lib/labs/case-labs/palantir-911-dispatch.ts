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
          "Before I show you my scores, grade yourself on the same rubric I use: handling ambiguity, decomposition, design, code correctness, and communication. Commit to a real number from 1 to 5 on each. Then the part every Palantir hiring manager asks: this recommender decides who gets an ambulance first, so who does it help, who could it hurt if you got it wrong, and which one moment in this lab would you redo?",
        whatItTests:
          "Two things at once. First, whether you can score your own work honestly: the gap between your self-score and mine is itself signal, and calibrated self-awareness is what Palantir promotes people on. Second, how you handle the behavioral and mission framing a hiring manager folds into every loop. Palantir screens for missionaries over mercenaries, so for a life-critical dispatch tool 'it was an interesting problem' is not an answer that lands here.",
        howToApproach: [
          "Score each dimension with a committed number before you read my grade. Hedging defeats the exercise; a real number makes the comparison honest.",
          "Tie each score to a moment, not a mood: 'I scoped what best means fast, but I froze on the stale-GPS curveball and trusted live coordinates too long.'",
          "Answer the human question straight. This tool ranks who reaches a dying person first, so name who it serves and the specific failure that hurts someone (stale GPS sending the second-closest unit while the real nearest one sits idle). Owning the stakes reads as mission fit; dodging them reads as a mercenary.",
          "Read the gap between your number and mine as information. Where you over-rated yourself is your blind spot; where you under-rated is a strength you are discounting. Do not argue your score back up.",
          "Leave with one sharp, drillable next action, not 'communicate better.' Name the move: 'design the fallback path before the ranking math.'",
        ],
        whatGoodLooksLike: [
          "Self-scores that track the transcript, not a flat row of high or low numbers.",
          "You name a specific weak moment before I ask, and one concrete thing you would redo.",
          "You speak to who the system helps and who it could hurt without treating it as a throwaway, because a life-critical dispatch tool carries real weight.",
          "You read the self-versus-my-grade gap as data rather than defending your number.",
          "You walk out with one drillable next action tied to a real moment in the lab.",
        ],
        commonTrap:
          "Two ways to lose this round. Rating yourself a 5 across the board reads as low self-awareness, the exact thing this round is built to measure. And answering 'why this matters' with 'it is a fun technical challenge' reads as a mercenary, and Palantir hiring managers cut strong coders on that line. Name the human stakes and the one moment you would do over.",
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
          "Now break this dispatch system into its parts. Lay out the workflow a call goes through today, the core entities and their roles, and how a responder moves between states. Then point at the single bottleneck the software should attack, and defend why it's that one.",
        whatItTests:
          "Whether you can carve an ambiguous system into mutually exclusive, collectively exhaustive parts and isolate one bottleneck, instead of listing everything you can think of.",
        howToApproach: [
          "Trace one 911 call end to end as a workflow: received, triaged, units scanned, responder chosen, dispatched, on scene, cleared.",
          "Name the nouns as entities (Incident, Responder, Assignment, Location feed) with a one-line role each. If two entities overlap, you haven't decomposed cleanly yet.",
          "Model the state machine for the entity that carries the risk. A Responder moves available to assigned to en route to on scene to clearing; ask what breaks a transition, like a call cancelled mid-route.",
          "Commit to one bottleneck: the manual, inconsistent human choice of who to send. Say it out loud and justify why it, not the map or the phone system, is the thing to automate.",
        ],
        whatGoodLooksLike: [
          "Subproblems don't overlap and together cover the whole flow (MECE), rather than being a scattershot list.",
          "You model at least one entity's state transitions and probe the messy one, like a unit reassigned mid-task.",
          "You name exactly one bottleneck and defend why it's the highest-leverage target.",
          "You can point at where stale data and concurrent assignment enter the flow.",
        ],
        commonTrap:
          "Listing ten subproblems with no ranking. Palantir wants the one bottleneck named and defended; an unranked list reads as 'I can't tell what matters most.'",
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
          "Commit to a contract for the recommender. What's the function or endpoint signature, what goes in and what comes out, and what does it do when the closest unit's GPS is stale or two calls arrive for the same unit at once? Defend each choice as I push on it.",
        whatItTests:
          "Whether you can commit to a concrete interface and defend it live as constraints change, instead of staying comfortably vague. This is where the interviewer folds in behavioral pressure.",
        howToApproach: [
          "Pin the contract to concrete types. recommendResponder(incident, units) returns a ranked list with a reason, not a vague 'the system decides.'",
          "Make your ranking inputs explicit (ETA, severity match, unit availability) and state how you weight them.",
          "Design the failure path first, not last: what happens when GPS is stale, when no unit is in range, and when two incidents want the same unit.",
          "When I inject a curveball, revise or defend out loud. Changing your mind with a reason is a pass; freezing or getting defensive is not.",
        ],
        whatGoodLooksLike: [
          "A signature a teammate could implement from, with typed inputs and outputs.",
          "An explicit fallback for stale data, no-unit-available, and concurrent assignment.",
          "You justify each tradeoff by naming what breaks with the other option, not by preference.",
          "You stay steady under the curveball and adjust the design rather than defending a sunk choice.",
        ],
        commonTrap:
          "Polishing the ranking math while ignoring the fail-safe. Under stale GPS the 'closest' unit may already be blocks away; a design with no degraded mode is the one that gets people hurt, and the interviewer knows it.",
      },
    },
    {
      kind: "build",
      title: "Build",
      purpose: "Implement the recommender inside the real codebase and get the tests green.",
      guidance: {
        interviewerPrompt:
          "Here's the real dispatch codebase. Implement the recommender you just designed so the pre-written tests go green. I care less about clever code than whether your design survives contact with real inputs. Talk me through it as you go.",
        whatItTests:
          "Whether your design actually holds up in code, and whether you can work inside an unfamiliar existing codebase rather than a blank file. The tests are given; test-writing isn't what's being graded here.",
        howToApproach: [
          "Read the existing files before you type. Find where the recommender plugs in and what shape the data already has.",
          "Implement the core contract you committed to in Design, not a bigger system. Get the signature and the ranking logic right first.",
          "Run the tests early and often, and let failures point you at the input your design didn't handle, like a stale timestamp or an empty unit list.",
          "When your code diverges from what you claimed in Design, say so and reconcile it out loud. Silent drift is exactly what interviewers catch.",
        ],
        whatGoodLooksLike: [
          "You edit the right files and leave the read-only reference untouched.",
          "The core ranking and fallback behave the way your Design promised.",
          "You use failing tests as a signal rather than a panic, and narrate what each failure taught you.",
          "The code handles the degraded cases (stale or empty inputs), not just the happy path.",
        ],
        commonTrap:
          "Rewriting unrelated parts of the codebase or gold-plating a full system. Scope small: make the contract you designed pass the given tests, then stop.",
      },
    },
    {
      kind: "review",
      title: "Review",
      purpose: "Defend your choices against the curveballs, then grade yourself.",
      guidance: {
        interviewerPrompt:
          "Grade yourself against the same rubric I use: handling ambiguity, decomposition, design, code correctness, and communication. Then we'll compare. Where do you think you were strong, and where did you feel yourself slip?",
        whatItTests:
          "Whether you can assess your own work honestly. The gap between your self-score and the interviewer's is itself signal: calibrated self-awareness is what Palantir promotes people on.",
        howToApproach: [
          "Score each dimension before you read the AI grade. Commit to a number so the comparison is real.",
          "Tie each score to a moment: 'I scoped best fast, but I froze on the stale-GPS curveball.'",
          "Read the interviewer feedback and hunt for the gap. Where you over-rated yourself is your blind spot; where you under-rated is a strength you're discounting.",
          "Turn the biggest gap into one concrete thing to drill next, not a vague 'communicate better.'",
        ],
        whatGoodLooksLike: [
          "Self-scores that track the transcript, not uniformly high or low.",
          "You name a specific weak moment without being asked.",
          "You read the self-versus-AI gap as information rather than defending your number.",
          "You leave with one sharp, drillable next action.",
        ],
        commonTrap:
          "Rating yourself a 5 across the board. Interviewers read uniform self-praise as low self-awareness, which is the one thing this round is built to measure.",
      },
    },
  ],
}
