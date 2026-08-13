/**
 * Pins the corrected facts that recur at many sites, so they cannot quietly come back.
 *
 * Every claim below was wrong in the corpus on 2026-08-13, at between two and six sites each, and
 * several of them contradicted a DIFFERENT lesson that already had it right. That is the pattern
 * worth defending against: not a typo, but a plausible-sounding claim that propagates by being
 * copied from a neighbouring lesson. Prose is where rules drift. A test over the resolved curriculum
 * is where they stop.
 *
 * ## Why the resolved curriculum and not the source files
 *
 * The level files keep teach markdown in top-level consts far from the lesson ids that use them, so
 * a grep over source tells you a string exists somewhere in a 5,000-line file. Walking the registry
 * gives the lesson id, which is what an author needs in the failure message.
 *
 * ## Scope
 *
 * Assertions are deliberately narrow: they match the WRONG phrasing, not the right one. There are
 * many correct ways to describe Linkerd's data plane and only one wrong one worth naming, so
 * matching the defect leaves authors free to write. A test that pinned the exact corrected sentence
 * would fail the first time someone improved it.
 */
import { describe, expect, it } from "vitest"

import { listAllSystemDesignLessons } from "../registry"
import type { DesignLesson } from "@/lib/tutorials/types"

/** Everything a reader can see in a lesson: teach prose plus both exercises. */
function readableText(lesson: DesignLesson): { where: string; text: string }[] {
  const exercise = (label: string, ex: DesignLesson["apply"]) => [
    { where: `${lesson.id} ${label} prompt`, text: ex.prompt },
    { where: `${lesson.id} ${label} thinkAbout`, text: ex.thinkAbout.join("\n") },
    { where: `${lesson.id} ${label} modelAnswer`, text: ex.modelAnswerOutline.join("\n") },
  ]
  return [
    { where: `${lesson.id} teach`, text: lesson.teach.markdown },
    { where: `${lesson.id} summary`, text: lesson.summary },
    ...exercise("apply", lesson.apply),
    ...exercise("practice", lesson.practice),
  ]
}

interface BannedClaim {
  /** What was wrong, and what is true instead. Printed on failure. */
  name: string
  pattern: RegExp
  correction: string
}

const BANNED_CLAIMS: BannedClaim[] = [
  {
    name: "HyperLogLog's 12 KB paired with ~2 percent error",
    // Only the PAIRING is wrong. "~2 percent error" unpaired is defensible for a different register
    // count, so the pattern requires both figures close together, in either order.
    pattern:
      /(12\s?KB[^.]{0,80}?(~|about\s|roughly\s)?2(\.0)?\s?(%|percent))|((~|about\s|roughly\s)?2(\.0)?\s?(%|percent)[^.]{0,80}?12\s?KB)/i,
    correction:
      "Redis uses 16,384 six-bit registers, which is exactly 12 KB and about 0.81 percent standard " +
      "error (1.04/sqrt(m)). level3 already states 0.8 percent correctly.",
  },
  {
    name: "Linkerd's data plane described as Envoy",
    // Istio genuinely uses Envoy, so the defect is only the construction that sweeps both meshes
    // into one Envoy claim.
    pattern: /Linkerd[^.]{0,40}?with Envoy|Istio (or|and) Linkerd[^.]{0,60}?Envoy sidecars/i,
    correction:
      "Linkerd's data plane is linkerd2-proxy, written in Rust. Not being Envoy is its headline " +
      'differentiator. Write "Istio (Envoy sidecars) or Linkerd (its own Rust micro-proxy)".',
  },
  {
    name: "ephemeral ports given as ~64K",
    pattern: /(~|about\s|roughly\s)?64\s?K\s+ephemeral ports|ephemeral ports[^.]{0,30}?64\s?K/i,
    correction:
      "Linux defaults to 32768-60999, about 28k, and the limit applies per (source IP, destination " +
      "IP, destination port) tuple rather than per host. level1 already teaches 28k and marks it " +
      "correct in a widget.",
  },
  {
    name: "Cilium described as doing mTLS in the kernel via eBPF",
    pattern:
      /mTLS[^.]{0,40}?into the kernel|eBPF[^.]{0,60}?(performs|does|handles)[^.]{0,20}?mTLS/i,
    correction:
      "eBPF does not perform a TLS handshake. Cilium enforces identity-based L3/L4 policy in the " +
      "kernel via eBPF, authenticates mutually in its agent using SPIFFE identities, and encrypts " +
      "with WireGuard or IPsec. That is not per-connection mTLS.",
  },
  {
    name: "erasure coding priced at 3x replication",
    pattern: /3x replication or erasure coding|erasure coding[^.]{0,30}?at 3x/i,
    correction:
      "Erasure coding stores parity shards rather than whole copies, so it lands near 1.x, not 3x. " +
      "sd-l10-object-store-s3 calls knowing this the junior/senior tell.",
  },
  {
    name: "MQTT attributed to WhatsApp",
    pattern: /MQTT[^.]{0,40}?WhatsApp (used|adopted|ran)/i,
    correction:
      "MQTT and the battery rationale are Facebook Messenger's 2011 choice. WhatsApp ran a " +
      "customized binary XMPP.",
  },
]

describe("system design corpus facts", () => {
  const lessons = listAllSystemDesignLessons()

  it("walks a real corpus, so the bans cannot pass vacuously", () => {
    expect(lessons.length).toBe(208)
    const totalText = lessons.flatMap(readableText).reduce((n, block) => n + block.text.length, 0)
    expect(totalText).toBeGreaterThan(1_000_000)
  })

  for (const claim of BANNED_CLAIMS) {
    it(`never reintroduces: ${claim.name}`, () => {
      const hits: string[] = []
      for (const lesson of lessons) {
        for (const block of readableText(lesson)) {
          if (claim.pattern.test(block.text)) hits.push(block.where)
        }
      }
      expect(hits, `${hits.join(", ")}\n\n${claim.correction}`).toEqual([])
    })
  }
})
