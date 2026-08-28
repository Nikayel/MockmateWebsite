/**
 * Meridian's onboarding cinematic — the full five-beat "you're hired" arc.
 *
 * Every line here is true of the actual Meridian repo (`workbooks/meridian/`):
 * the pitch is `MERIDIAN.md`'s own opening, and each system-map module names a
 * real top-level directory. `meridian-config.test.ts` pins those paths to the
 * filesystem, the same way `/labs`'s copy is checked against the code it
 * describes — a map that lies about where things live is worse than no map.
 */

import type { OnboardingConfig } from "@/lib/labs/onboarding/config"

export const MERIDIAN_ONBOARDING: OnboardingConfig = {
  id: "meridian",
  company: "Meridian",
  beats: [
    {
      kind: "offer",
      chapter: "Offer",
      lines: [
        "Meridian — Claims Platform",
        "You're hired. Backend engineer, third on the team, starting today.",
      ],
    },
    {
      kind: "company",
      chapter: "The company",
      heading: "What Meridian does",
      lines: [
        "Insurers send us claim documents. We pull out what matters, apply the policy, and post the result back to them over a webhook.",
        "Money and other people's data are both on the line, every request.",
        "The code you're inheriting was written by people who have since left.",
      ],
    },
    {
      kind: "system-map",
      chapter: "The system",
      heading: "The codebase you'll live in",
      modules: [
        {
          id: "http",
          label: "the front door",
          role: "Every request and response is JSON, and nothing arrives already validated.",
          path: "src/http",
        },
        {
          id: "domain",
          label: "claims & policy",
          role: "Where a claim becomes a decision: what it is, and what it's worth.",
          path: "src/domain",
        },
        {
          id: "money",
          label: "money",
          role: "One function rounds a dollar. Nothing else is allowed to reimplement it.",
          path: "src/money",
        },
        {
          id: "db",
          label: "persistence",
          role: "One narrow interface: hand it a query and its parameters, get rows back.",
          path: "src/db",
        },
        {
          id: "delivery",
          label: "delivery",
          role: "One signed webhook, drained from a queue one entry at a time, in order.",
          path: "src/delivery",
        },
        {
          id: "test",
          label: "the safety net",
          role: "The tests that turn from red to green when your ticket is actually done.",
          path: "test",
        },
      ],
    },
    {
      kind: "pair",
      chapter: "Your pair",
      partnerName: "Sable",
      lines: [
        "I'm Sable. I'll pair with you on this codebase.",
        "Ask me what a file is for, where something lives, or why a test is red. That's what I'm here for.",
      ],
    },
    {
      kind: "handoff",
      chapter: "Day one",
      heading: "Your first sprint is waiting",
      body: "Standup first, then the board. Pick up where the last engineer left off, one ticket at a time.",
      ctaLabel: "Enter Meridian",
    },
  ],
}
