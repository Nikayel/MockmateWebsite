/**
 * Palantir — Ontology Learning Round Case Lab.
 *
 * The Learning / Applied Learning round counterpart to the 911 Dispatch
 * (decomposition) and Usage Rollup (re-engineering) labs, and the intern-friendly
 * entry point of the Palantir track. Palantir's Learning round hands you an
 * unfamiliar system or API with minimal docs and scores how fast you build a
 * working mental model, then apply it to problems of increasing difficulty. Here
 * the unfamiliar API is a tiny slice of Palantir's own core abstraction: an
 * Ontology of objects, properties, and typed links. The Build milestone reuses
 * the `palantir-ontology-org-build` workspace scenario (learn the API cold, then
 * implement three org-chart queries that climb from a filter to a traversal).
 */

import type { CaseLab } from "@/lib/labs/types"

export const palantirOntologyLearning: CaseLab = {
  id: "palantir-ontology-learning",
  title: "Ontology Learning Round",
  company: "palantir",
  role: "FDSE",
  difficulty: "easy",
  estimatedMinutes: 45,
  brief: {
    situation:
      "You've been handed a small slice of a company's Ontology: Employee and Team objects with properties, connected by typed links for who reports to whom and who is on which team. The catch is you have never seen this Ontology API before, and the only documentation is the docstrings in one read-only file. A stakeholder wants three org-chart answers out of it, and the API does not work the way you might expect.",
    task: "Across five milestones you'll learn the unfamiliar Ontology API cold, decompose three questions into the primitives it actually gives you, design the one query that needs a real traversal, implement all three in the live codebase until the tests pass, then reflect on how you learned a system you did not build.",
  },
  whyThisCompany:
    "Palantir's Learning round hands you an unfamiliar system, API, or language feature with minimal docs and watches how fast and accurately you build a working mental model, then apply it to problems of increasing difficulty. It maps directly to the forward-deployed job: an FDSE lands at a new client and has to learn their Foundry Ontology and data model cold, then be useful fast. This lab mirrors that round using Palantir's own core abstraction, the Ontology of objects and typed links. It is the gentler, intern-friendly end of the loop: the API is tiny and the org is small, but the signal is whether you read before you guess. It is one round of a longer loop, so treat it as onsite prep, not the whole bar.",
  coverage: {
    covers: [
      "Learning / Applied Learning round (model an unfamiliar API cold, then solve problems of increasing difficulty)",
      "Reading minimal docs and building a mental model before writing code",
    ],
    prepElsewhere: [
      {
        round: "Decomposition round (scope an open-ended system)",
        cta: "911 Dispatch lab",
        href: "/labs/palantir-911-dispatch",
      },
      {
        round: "Re-engineering / debugging round (find a subtle bug in unfamiliar code)",
        cta: "Usage Rollup lab",
        href: "/labs/palantir-usage-rollup",
      },
      {
        round: "Online Assessment + live coding (Python / DSA)",
        cta: "Daily practice",
        href: "/practice",
      },
      {
        round: "Behavioral, “why Palantir,” and mission fit",
        cta: "Palantir prep",
        href: "/interview-prep/palantir",
      },
    ],
  },
  skills: [
    "learning unfamiliar APIs",
    "reading minimal docs",
    "graph traversal",
    "palantir ontology",
  ],
  buildScenarioId: "palantir-ontology-org-build",
  buildScenarioType: "add-functionality",
  buildLanguage: "python",
  buildCurveball: {
    title: "Curveball: a dotted-line report just appeared",
    prompt:
      "Ops adds a second reporting link: some Employees now have a 'dotted_line_to' manager on top of their reports_to manager. Should total headcount count a dotted-line report, and how does your traversal change now that one person can be reached through two different managers? Make sure nobody gets counted twice.",
  },
  milestones: [
    {
      kind: "clarify",
      title: "Clarify",
      purpose: "Learn what the unfamiliar API actually does before you write a query.",
      mapsToRound: "Learning round",
      guidance: {
        interviewerPrompt:
          "Here's an Ontology API you've never seen, documented only by the docstrings in one file. Before you write any query, tell me how you'd figure out what objects(), get(), and links() actually do and where they would surprise you. What do you check first?",
        whatItTests:
          "Whether you build an accurate mental model of an unfamiliar API from minimal docs before coding, instead of guessing at how the methods behave.",
        howToApproach: [
          "Read the one file end to end: list the object types, the properties, and every link type it exposes.",
          "Pin down each method's exact contract: what objects() returns, what get() does on a missing property, what links() returns when there are none.",
          "Find the shape of the data: is reports_to stored on the report or the manager, and is there a reverse link back.",
          "Write down the one thing the docstrings don't tell you, and how you'd confirm it in a line of code.",
        ],
        whatGoodLooksLike: [
          "You can state what each of the three methods returns without running anything.",
          "You notice there is no reverse link before you try to use one.",
          "You separate what the docs promise from what you are assuming.",
        ],
        commonTrap:
          "Assuming the API works like an ORM or a graph library you already know, and writing queries against methods that do not exist.",
      },
      ghostExample: {
        dimension: "api-contract",
        question: "What does links(link_type) return when the object has no links of that type?",
        assumption:
          "An empty list, so a caller can iterate the result safely without a None check.",
      },
    },
    {
      kind: "decompose",
      title: "Decompose",
      purpose: "Map the three questions onto the primitives the API really gives you.",
      mapsToRound: "Learning round",
      guidance: {
        interviewerPrompt:
          "Map the API to the three questions you have to answer. For counting a team, listing direct reports, and total headcount, which of objects(), get(), and links() do you compose, and in what order? Point at the one that needs more than a single hop.",
        whatItTests:
          "Whether you can decompose real questions into the primitives an unfamiliar API actually offers, and spot which one needs traversal rather than a filter.",
        howToApproach: [
          "For team size, decide how you get from a Team name to its Employees when links only run from Employee to Team.",
          "For direct reports, decide how you invert reports_to when there is no manages link.",
          "For total headcount, recognize it is not one hop: you follow the reporting chain down until it ends.",
          "Name the reusable step, find every report of a person, that the hard query repeats.",
        ],
        whatGoodLooksLike: [
          "You express each query as a small composition of objects(), get(), and links().",
          "You call out that headcount is a traversal, not a filter.",
          "You reuse the direct-reports idea inside the headcount plan instead of inventing a new mechanism.",
        ],
        commonTrap:
          "Treating total headcount as just a bigger direct_reports and counting only one level deep.",
      },
      ghostExample: {
        workflow: [
          "objects('Employee') lists every employee object",
          "emp.links('reports_to') gives that employee's manager (0 or 1)",
          "emp.links('on_team') gives the teams that employee is on",
        ],
        entities: [
          { name: "Employee", role: "an object with name, title, and level properties" },
          { name: "Team", role: "an object an Employee is linked to via on_team" },
          {
            name: "reports_to link",
            role: "the directed edge from a report up to their manager, with no reverse",
          },
        ],
      },
    },
    {
      kind: "design",
      title: "Design",
      purpose: "Commit to a correct, terminating traversal for the hardest query.",
      mapsToRound: "Learning round",
      guidance: {
        interviewerPrompt:
          "Before you code the hard one, walk me through total_headcount. There is no reverse link and the tree can be several levels deep. What's your traversal, how do you avoid counting anyone twice, and what happens for a manager name that isn't in the Ontology?",
        whatItTests:
          "Whether you commit to a correct, terminating traversal over an unfamiliar data model and handle the empty and unknown cases before writing it.",
        howToApproach: [
          "Decide how you build the manager-to-reports mapping once from the reports_to links.",
          "Pick a traversal, a stack or a queue, and say why it terminates on a finite reporting tree.",
          "Decide how you avoid double counting if the same person is reached more than once.",
          "State what team_size, direct_reports, and total_headcount each return for a name that does not exist.",
        ],
        whatGoodLooksLike: [
          "A traversal you can defend as terminating and counting each report exactly once.",
          "Explicit empty and unknown handling, not an afterthought.",
          "The plan reuses the invert-the-link step from Decompose.",
        ],
        commonTrap:
          "Recursing with no base case or no seen set, or forgetting that an unknown manager must return zero rather than raise.",
      },
    },
    {
      kind: "build",
      title: "Build",
      purpose: "Turn the plan into working code against the API you just learned.",
      mapsToRound: "Learning round",
      guidance: {
        interviewerPrompt:
          "Open src/analysis.py and implement the three queries against the read-only Ontology, then wire org_summary in src/report.py. The visible tests cover the first two; a hidden test checks transitive headcount and the unknown cases. Get them all green using only objects(), get(), and links().",
        whatItTests:
          "Whether you turn your plan into correct code against an API you just met, and pass the hidden transitive and edge cases, not only the visible ones.",
        howToApproach: [
          "Implement team_size and direct_reports first, then run the visible tests.",
          "Build the child mapping once, then traverse it for total_headcount.",
          "Handle the unknown manager and unknown team before you call it done.",
          "Wire org_summary to reuse your functions rather than recomputing anything.",
        ],
        whatGoodLooksLike: [
          "All visible and hidden tests pass, including transitive headcount.",
          "You use only the three documented methods, not invented ones.",
          "org_summary composes the queries instead of duplicating their logic.",
        ],
        commonTrap:
          "Passing the visible one-hop tests but counting headcount only one level deep, so the hidden transitive test fails.",
      },
    },
    {
      kind: "review",
      title: "Review",
      purpose: "Reflect on how you learned a system you did not build.",
      mapsToRound: "Self-review + mission reflection",
      guidance: {
        interviewerPrompt:
          "Tell me what surprised you about this API, and where a wrong assumption cost you time. Then the part that matters here: a real FDSE meets an unfamiliar Foundry or client API on day one. What did this exercise teach you about how you learn a system you've never seen?",
        whatItTests:
          "Whether you can name what you learned about an unfamiliar system, admit where an assumption was wrong, and connect it to the forward-deployed job of modeling a client's world you did not build.",
        howToApproach: [
          "Say the one assumption about the API that turned out wrong and how you caught it.",
          "Name the query that was hardest and why it needed traversal, not a filter.",
          "Point at what the docstrings did not tell you that you had to test for yourself.",
          "Connect it to the job: an FDSE learns a new client's Ontology cold and has to be right fast.",
        ],
        whatGoodLooksLike: [
          "You volunteer a wrong assumption instead of claiming you read it perfectly.",
          "You tie the traversal insight to how the data model was shaped.",
          "You treat learning an unfamiliar system as the core skill, not a nuisance.",
        ],
        commonTrap:
          "Saying the API was easy and skipping the reflection. This round scores how you learn, so name what you learned.",
      },
    },
  ],
}
