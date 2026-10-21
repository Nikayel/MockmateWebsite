import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"

export const bookclubDocumentationFiles: WorkspaceScenarioFile[] = [
  {
    path: "README.md",
    role: "docs",
    language: "markdown",
    content: `# BookClub — reader dashboard service

BookClub tracks reading sessions, including rereads. This dependency-free Python
service is the executable application: routes call services backed by an in-memory
repository and a response cache. No separate Flask reference copy is needed.

## Start here
Read \`task.md\`, follow the phase rail, then use **Run Tests**. Upcoming phases
open after the current phase's checks pass. Completed phases remain available to
review. Code is shared across phases, so preserve earlier behavior as you work.

Locally: \`python3 tests/run_workspace_tests.py\` (Python 3.10+, no pip install).
The runner executes all checks; the browser progressively reveals phase results.
Tests and fixtures are contracts. Edit the application services, not the oracle.

## Repository map
- \`app/routes.py\`: profile and completion request adapters, executable in tests.
- \`app/services/\`: streak, calendar totals, paginated history, cached dashboards.
- \`app/repository.py\`: reader-scoped records, ownership checks, mutation revision.
- \`app/calendar.py\`: reader-local calendar conversion.
- \`fixtures/readers.json\`: deterministic support reproduction (today: 2026-06-28).
- \`docs/incident.md\`: support timeline and sampled request logs.
- \`task.md\`: product contracts and acceptance criteria.
- \`tests/\`: runnable reproductions and regression checks.

## Runtime boundary
The adapters stand in for HTTP handlers; there is no network server or database.
An authenticated reader ID is supplied by the caller. Production concerns such as
sessions, Redis transactions, and real provider integrations are outside this lab.
All timestamps are timezone-aware. Reader offsets are fixed numeric UTC offsets
stored on the profile, not IANA zones; daylight-saving transitions are outside the
contract. Dates passed to services are already the reader's local 'today'.
`,
  },
  {
    path: "task.md",
    role: "docs",
    language: "markdown",
    content: `# Repair the reader dashboard

## Incident
Support has escalated inconsistent reading profiles after the dashboard rollout.
Alex's streak is zero despite three consecutive completion days. As you verify
the repair, follow the next support reproduction in each phase. Keep changes
small, explain the evidence, and preserve the public service signatures.

## Phases
1. **Investigate** — read this contract and the incident timeline, then continue.
2. **Restore streaks · Easy** — fix completion-day streaks; run its checks to open phase 3.
3. **Repair history · Medium** — restore ordering and complete pagination; passing checks open phase 4.
4. **Reconcile calendars · Medium–hard** — correct monthly boundaries; passing checks open phase 5.
5. **Refresh dashboards · Hard** — verify request isolation and freshness; passing checks open phase 6.
6. **Release check** — run the entire regression suite on your final code.

Read-and-continue phases advance explicitly. Coding phases advance only after
all their visible and additional regression checks pass. The next phase stays
closed until then. You can revisit completed instructions without losing progress.

## Product contract
- A streak is the consecutive local calendar days **ending today** with at least
  one completed reading event. In-progress sessions do not count. Several finishes
  in a day count as one day; future finishes cannot extend today's streak.
- History contains only this reader's completed events. Order by completion time,
  then event ID, both descending. Rereads remain separate events.
- Page sizes are integers 1–50. A cursor carries completion time and event ID.
  Pages exclude that event and contain no skips or repeats, including timestamp ties.
  Return no next cursor on the last page. Invalid cursors/page sizes raise ValueError.
- Books this month counts completed events in the reader's local **year and month**.
  Convert UTC timestamps with the profile's fixed offset (including fractional-hour
  offsets). A repeated reading of one book counts again. In-progress sessions do not.
- Total pages sums the book's pages for each completed event, including rereads.
- A dashboard is scoped to the reader, local date, configured offset, and repository
  revision. A completed book must appear in the next request. A new local day must
  not reuse yesterday's stats. Mutating a response must not mutate cached responses.
- Completion requests may only change an event belonging to the authenticated
  reader. Repeating a completion is safe and does not double-count pages or books.

## Definition of done
All 36 checks pass against the final workspace. Explain one reproduction, cause,
fix, and regression check for each repair. Use the Release check phase to verify
the whole route → service → repository → response flow before submitting.
`,
  },
  {
    path: "docs/incident.md",
    role: "docs",
    language: "markdown",
    content: `# Support escalation BC-284

2026-06-28 10:15 UTC — Alex: "I finished a book each of the last three days.
My profile says zero. Books this month and pages look right."

Reproduction: \`get_profile(1, date(2026, 6, 28))\` with the seed fixture.
Expected stats: streak 3, books this month 4, pages 1270.
Observed first request: streak 0, books this month 4, pages 1270.

Additional rollout reports (investigate in phase order):
- BC-285: the newest finish is buried; paging misses one of two simultaneous finishes.
- BC-286: readers near UTC midnight see books attributed to a different month.
- BC-287: switching readers or completing a book sometimes returns an older dashboard.

Sampled requests, fresh process, no writes between these calls:
\`\`\`
GET /readers/1/profile local_date=2026-06-28 -> stats.user_id=1 streak=0
GET /readers/2/profile local_date=2026-06-28 -> stats.user_id=1 streak=0
\`\`\`
Treat logs as observations, not proof of a particular implementation cause.
The profile fixture uses synthetic readers and books; no external account is involved.
`,
  },
  {
    path: "fixtures/readers.json",
    role: "readonly",
    language: "json",
    content: `{
  "readers": [
    {
      "id": 1,
      "name": "Alex",
      "utc_offset_minutes": 0
    },
    {
      "id": 2,
      "name": "Priya",
      "utc_offset_minutes": -300
    },
    {
      "id": 3,
      "name": "Marcus",
      "utc_offset_minutes": 330
    },
    {
      "id": 4,
      "name": "Dana",
      "utc_offset_minutes": 0
    },
    {
      "id": 5,
      "name": "Nadia",
      "utc_offset_minutes": 840
    }
  ],
  "books": [
    {
      "id": 1,
      "title": "Deep Work",
      "pages": 320
    },
    {
      "id": 2,
      "title": "The Pragmatic Programmer",
      "pages": 280
    },
    {
      "id": 3,
      "title": "Refactoring",
      "pages": 350
    },
    {
      "id": 4,
      "title": "Designing Data-Intensive Applications",
      "pages": 600
    }
  ],
  "events": [
    {
      "id": 101,
      "user_id": 1,
      "book_id": 1,
      "started_at": "2026-06-01T10:00:00+00:00",
      "finished_at": "2026-06-26T10:00:00+00:00"
    },
    {
      "id": 102,
      "user_id": 1,
      "book_id": 2,
      "started_at": "2026-06-20T10:00:00+00:00",
      "finished_at": "2026-06-27T10:00:00+00:00"
    },
    {
      "id": 103,
      "user_id": 1,
      "book_id": 3,
      "started_at": "2026-06-05T10:00:00+00:00",
      "finished_at": "2026-06-28T10:00:00+00:00"
    },
    {
      "id": 104,
      "user_id": 1,
      "book_id": 4,
      "started_at": "2026-06-28T09:00:00+00:00",
      "finished_at": null
    },
    {
      "id": 105,
      "user_id": 1,
      "book_id": 1,
      "started_at": "2026-06-24T10:00:00+00:00",
      "finished_at": "2026-06-27T10:00:00+00:00"
    }
  ]
}
`,
  },
]
