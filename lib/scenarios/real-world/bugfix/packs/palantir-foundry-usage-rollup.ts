/**
 * Pack: palantir-foundry-usage-rollup (difficulty 2, bug_class double-count).
 *
 * CLIENT-SAFE module. Compiled from packs/palantir-foundry-usage-rollup/ and validated
 * by execution (generate-pack.md Step 3, all 7 checks). The sealed solution + phase-2
 * payload live in lib/scenarios/sealed/palantir-foundry-usage-rollup.server.ts.
 */

import type { BugfixPack } from "@/lib/bugfix/packs/types"
import { packToScenario } from "@/lib/bugfix/packs/scenario"

const SRC_ROLLUP = `import sys

VALID_STREAMS = ("primary", "backup")


def parse_events(path):
    events = []
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\\n")
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) != 4:
                continue
            stream, account_id, event_id, seconds = (part.strip() for part in parts)
            if stream not in VALID_STREAMS:
                continue
            if seconds == "":
                continue
            try:
                seconds_value = int(seconds)
            except ValueError:
                continue
            events.append(
                {
                    "stream": stream,
                    "account_id": account_id.lower(),
                    "event_id": event_id,
                    "seconds": seconds_value,
                }
            )
    return events


def dedupe(events):
    seen = set()
    unique = []
    for event in events:
        if event["event_id"] in seen:
            continue
        seen.add(event["event_id"])
        unique.append(event)
    return unique


def rollup(events):
    totals = {}
    primary = dedupe([event for event in events if event["stream"] == "primary"])
    backup = dedupe([event for event in events if event["stream"] == "backup"])
    for event in primary + backup:
        totals[event["account_id"]] = totals.get(event["account_id"], 0) + event["seconds"]
    return totals


def main():
    events = parse_events(sys.argv[1])
    totals = rollup(events)
    print("=== Compute-seconds by account ===")
    for account_id in sorted(totals):
        print(account_id + ": " + str(totals[account_id]))


if __name__ == "__main__":
    main()
`

const FIXTURE_INPUT = `# stream,account_id,event_id,compute_seconds
primary,acme,evt-1,40
primary,acme,evt-2,2
backup,acme,evt-1,40
primary,globex,evt-3,17
backup,globex,evt-4,5
primary,initech,evt-5,30
primary,initech,evt-5,30
backup,Umbrella,evt-6,12
# truncated row below is skipped by contract
backup,globex,evt-9
backup,acme,evt-7,
`

const EXPECTED_OUTPUT = `=== Compute-seconds by account ===
acme: 42
globex: 22
initech: 30
umbrella: 12
`

const TASK_MD = `# Foundry usage rollup — nightly compute-seconds bill

## Who reads this
The FinOps on-call runs this rollup every night to bill each account for the
compute-seconds it used. This morning they flagged that one account's total looks
higher than the metering dashboard shows, and billing is paused until it is trusted.

## The program
\`rollup.py\` reads a usage feed and prints total compute-seconds per account.

Each account's usage is delivered on two replica streams for durability: \`primary\`
and \`backup\`. The bus is at-least-once, so the SAME event (identified by its
\`event_id\`) can arrive more than once, including once on each replica — those are the
same event, not two.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with \`#\` are comments.
- Columns are \`stream,account_id,event_id,compute_seconds\`.
- \`account_id\` is case-insensitive; "Umbrella" and "umbrella" are the same account.
- A line that is truncated or has a non-numeric \`compute_seconds\` is malformed and is
  skipped.
- Streams other than \`primary\`/\`backup\` are ignored.

## Run it
\`\`\`
python3 src/rollup.py fixtures/input.txt
\`\`\`

## Expected output
\`\`\`
=== Compute-seconds by account ===
acme: 42
globex: 22
initech: 30
umbrella: 12
\`\`\`

The solution file is off-limits.
`

export const palantirFoundryUsageRollupPack: BugfixPack = {
  id: "palantir-foundry-usage-rollup",
  title: "Foundry usage rollup bills one account too much",
  summary:
    "The nightly Foundry usage rollup reports higher compute-seconds than the dashboard for one account, and billing is paused until it is trusted.",
  company: {
    tag: "palantir-fdse",
    roundName: "Re-engineering / debugging round",
    confidence: "styled",
    notes:
      "Foundry-shaped data-pipeline dedup problem; subtle logic flaw, no syntax error (PACK_REALISM_GUIDE.md §1).",
  },
  companies: ["Palantir"],
  domain: "data-pipeline",
  language: "python",
  difficulty: 2,
  estMinutes: 45,
  bugClass: "double-count",
  taskMd: TASK_MD,
  srcFiles: [{ path: "src/rollup.py", content: SRC_ROLLUP }],
  fixtures: [{ path: "fixtures/input.txt", content: FIXTURE_INPUT }],
  runCmd: "python3 src/rollup.py fixtures/input.txt",
  expectedOutput: EXPECTED_OUTPUT,
}

export const palantirFoundryUsageRollupScenario = packToScenario(palantirFoundryUsageRollupPack)
