import type { GuidedLabConfig } from "@/lib/bugfix/guided-lab/types"

export const BOOKCLUB_SUITES = [
  "visible streak",
  "hidden streak",
  "visible history",
  "hidden history",
  "visible calendar",
  "hidden calendar",
  "visible cache",
  "hidden cache",
  "visible baseline",
]

export const bookclubGuidedLab: GuidedLabConfig = {
  version: "bookclub-guided-v2",
  verificationMilestoneId: "m6-release",
  milestones: [
    {
      id: "m1-investigate",
      title: "Investigate",
      purpose: "Read the incident and product contract before editing.",
      blocks: [
        {
          kind: "instruction",
          id: "read-contract",
          body: "Open **task.md** for the incident, rules, and phase map. Use **README.md** to trace routes → services → repository. Read **docs/incident.md** for the initial reproduction. Then continue to the first repair.",
        },
        {
          kind: "checkpoint",
          id: "investigation",
          title: "Ready to investigate",
          items: [
            "I read task.md and can describe the expected streak.",
            "I found the request entry point and the runnable service code.",
          ],
        },
      ],
      gate: { kind: "manual-ack" },
      revealTestSuites: ["visible baseline"],
    },
    {
      id: "m2-streak",
      title: "Restore streaks",
      purpose: "Easy · reproduce a wrong value, then make a focused repair.",
      bugId: "streak",
      blocks: [
        {
          kind: "instruction",
          id: "reproduce-streak",
          aiRestraint: true,
          body: "Run Tests. Alex should have a **3-day streak**, but the dashboard reports **0**. Monthly books and pages are useful comparison signals. Trace what a completed day means, make a repair, and run the checks again.",
        },
        {
          kind: "knowledge-card",
          id: "evidence",
          title: "Compare evidence",
          body: "A passing neighboring calculation narrows a hypothesis; it does not prove a shared dependency is correct. Compare the actual records with the contract before choosing a patch.",
        },
      ],
      gate: { kind: "tests-pass", testSuites: ["visible streak", "hidden streak"] },
      revealTestSuites: ["visible streak"],
    },
    {
      id: "m3-history",
      title: "Repair history",
      purpose: "Medium · follow ordering through page boundaries.",
      bugId: "history",
      dependsOn: ["m2-streak"],
      blocks: [
        {
          kind: "instruction",
          id: "reproduce-history",
          aiRestraint: true,
          body: "BC-285: Alex's newest finish is buried, and paging can miss a simultaneous finish. Check the complete ordering and then follow a cursor into the next page. Keep rereads and timestamp ties; task.md defines the tie-break rule.",
        },
        {
          kind: "knowledge-card",
          id: "pagination",
          title: "Verify across requests",
          body: "A first page can look correct while the second loses records. Collect IDs across every page and compare that sequence with the complete ordered history.",
        },
      ],
      gate: { kind: "tests-pass", testSuites: ["visible history", "hidden history"] },
      revealTestSuites: ["visible history"],
    },
    {
      id: "m4-calendar",
      title: "Reconcile calendars",
      purpose: "Medium–hard · investigate month and year boundaries.",
      bugId: "calendar",
      dependsOn: ["m3-history"],
      blocks: [
        {
          kind: "instruction",
          id: "reproduce-calendar",
          aiRestraint: true,
          body: "BC-286: a finish near UTC midnight belongs to a different month on the reader's calendar. Reproduce with Priya and Marcus. Check both sides of midnight, a fractional-hour offset, and New Year. Preserve streak and page totals.",
        },
      ],
      gate: { kind: "tests-pass", testSuites: ["visible calendar", "hidden calendar"] },
      revealTestSuites: ["visible calendar"],
    },
    {
      id: "m5-cache",
      title: "Refresh dashboards",
      purpose: "Hard · trace state across readers, mutations, and repeated requests.",
      bugId: "cache",
      dependsOn: ["m4-calendar"],
      blocks: [
        {
          kind: "instruction",
          id: "reproduce-cache",
          aiRestraint: true,
          body: "BC-287: isolated requests look fine, but switching readers or completing a book returns an older dashboard. Follow GET → completion → GET, then switch readers. Include response mutation and a new local day in your regression checks.",
        },
        {
          kind: "knowledge-card",
          id: "cache-contract",
          title: "State outlives one call",
          body: "List the inputs that determine a response, the writes that can make it stale, and who owns the returned object. Verify the request sequence, not only a function in isolation.",
        },
      ],
      gate: { kind: "tests-pass", testSuites: ["visible cache", "hidden cache"] },
      revealTestSuites: ["visible cache"],
    },
    {
      id: "m6-release",
      title: "Release check",
      purpose: "Run the full regression suite on the final code before submitting.",
      dependsOn: ["m5-cache"],
      blocks: [
        {
          kind: "instruction",
          id: "release",
          body: "Run Tests once more with all phases open. All **36 checks** must pass in this run. If an earlier behavior fails, its phase reopens. Before submitting, prepare a short explanation of each reproduction, cause, repair, and regression check. Editing code after verification requires another run.",
        },
      ],
      gate: { kind: "tests-pass", testSuites: BOOKCLUB_SUITES },
      revealTestSuites: BOOKCLUB_SUITES.filter((suite) => !suite.startsWith("hidden")),
    },
  ],
}
