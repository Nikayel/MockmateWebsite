/**
 * Sealing tests for the Sprint Labs content compiler (docs/sprint-labs/
 * PLAN.md Task 2), mirroring lib/bugfix/packs/__tests__/sealing.test.ts's
 * import-graph check:
 *   1. every generated sealed module carries the runtime `typeof window`
 *      throw (the guard that fires if a leak ever reaches the browser);
 *   2. only whitelisted server routes import the sealed registry loader
 *      (empty today — no consumer route exists yet; Tasks 6/8/14 add their
 *      route path here when they start reading sealed content), including
 *      repo-root entry points (middleware/proxy/instrumentation), not just
 *      app/components/lib/hooks (review round 1, M-6);
 *   3. no client component imports any sealed sprint-labs module, by alias
 *      or relative path;
 *   4. the compiled PUBLIC registry/content never imports the sealed tree
 *      at all (an extra, direction-specific check this split's shape makes
 *      possible);
 *   5. (review round 1, I-4) no distinctive SEALED string (a reference.diff
 *      hunk, a review comment body, a probe body, an io-case expected
 *      value) appears as TEXT inside any generated PUBLIC file. This is
 *      the only one of the five that catches a secret smuggled under a
 *      non-secret key — `assertPublicSafe` (compiler.test.ts) only checks
 *      KEY names, so a bug that copied `sealed.referenceDiff`'s value into
 *      a public `bodyMd` field would sail past it undetected.
 */

import { execSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { SealedTicketContent } from "@/lib/scenarios/sealed/sprint-labs/types"

const ROOT = process.cwd()
const SEALED_DIR = join(ROOT, "lib/scenarios/sealed/sprint-labs")
const PUBLIC_DIR = join(ROOT, "lib/sprint-labs/content")

// M-6: repo-root entry points that can also import server-only code,
// alongside the app/components/lib/hooks directories the bugfix precedent
// already scans.
const ROOT_LEVEL_FILES = [
  "middleware.ts",
  "proxy.ts",
  "instrumentation.ts",
  "instrumentation-client.ts",
]

function grepImporters(pattern: string): string[] {
  const rootFiles = ROOT_LEVEL_FILES.filter((f) => existsSync(join(ROOT, f)))
  const targets = ["app", "components", "lib", "hooks", ...rootFiles].join(" ")
  try {
    const out = execSync(
      `grep -rlE --include=*.ts --include=*.tsx "${pattern}" ${targets} 2>/dev/null || true`,
      {
        cwd: ROOT,
        encoding: "utf8",
      }
    )
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function listFilesRecursive(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const out: string[] = []
  for (const name of entries) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full))
    else out.push(full)
  }
  return out
}

/** Every distinctive secret-side string across every compiled sealed ticket, for the content-overlap scan (I-4). */
async function collectSealedMarkers(): Promise<string[]> {
  const markers: string[] = []
  // Per-ticket sealed modules only — registry.server.ts also ends in
  // ".server.ts" but exports loaders, not a `sealed` value.
  const perTicketServerFiles = listFilesRecursive(SEALED_DIR).filter(
    (f) => f.endsWith(".server.ts") && !f.endsWith("/registry.server.ts")
  )
  for (const serverFile of perTicketServerFiles) {
    const sealed = (await import(/* @vite-ignore */ serverFile)).sealed as SealedTicketContent
    if (sealed.referenceDiff) markers.push(sealed.referenceDiff)
    for (const comment of sealed.review ?? []) markers.push(comment.body)
    for (const hiddenCase of sealed.hiddenCases) {
      if (hiddenCase.kind === "probe" && hiddenCase.body) markers.push(hiddenCase.body)
      if (hiddenCase.kind === "io-case" && hiddenCase.expected !== undefined) {
        markers.push(JSON.stringify(hiddenCase.expected))
      }
      // Review round 2 cheap addition: `input` is SECRET_FIELDS-classified
      // too (issued at submit time, never in the static public bundle —
      // see lib/scenarios/sealed/sprint-labs/types.ts's SealedHiddenCase
      // doc comment), so the overlap scan must cover it alongside `expected`.
      if (hiddenCase.kind === "io-case" && hiddenCase.input !== undefined) {
        markers.push(JSON.stringify(hiddenCase.input))
      }
    }
    if (sealed.authorBrief) {
      markers.push(sealed.authorBrief.intent)
      for (const decision of sealed.authorBrief.decisions) {
        markers.push(decision.decision)
        markers.push(decision.justification)
      }
    }
  }
  return markers.filter((m) => typeof m === "string" && m.length > 0)
}

/** Every generated public .ts file's raw text that contains at least one marker, paired with which marker. */
function scanPublicFilesForMarkers(
  publicDir: string,
  markers: string[]
): { file: string; marker: string }[] {
  const violations: { file: string; marker: string }[] = []
  for (const file of listFilesRecursive(publicDir).filter((f) => f.endsWith(".ts"))) {
    const content = readFileSync(file, "utf8")
    for (const marker of markers) {
      if (content.includes(marker)) violations.push({ file, marker })
    }
  }
  return violations
}

describe("Sealing test 1 — every generated sealed module has the runtime window guard", () => {
  it("every *.server.ts under lib/scenarios/sealed/sprint-labs throws if loaded in a browser", () => {
    const serverFiles = listFilesRecursive(SEALED_DIR).filter((f) => f.endsWith(".server.ts"))
    expect(serverFiles.length).toBeGreaterThan(0)
    for (const file of serverFiles) {
      const content = readFileSync(file, "utf8")
      expect(content, `${file} is missing the typeof window guard`).toContain(
        'if (typeof window !== "undefined")'
      )
      expect(content, `${file}'s window guard does not throw`).toMatch(
        /typeof window[\s\S]{0,80}throw new Error/
      )
    }
  })
})

describe("Sealing test 2 — sealed sprint-labs content is imported only by whitelisted server-side modules", () => {
  // Task 6 (runs) adds its own path here if it starts calling
  // loadSealedTicket/hasSealedTicket.
  //
  // Task 8 (grading/submit): lib/sprint-labs/grading/attempts-service.ts is
  // the ONLY file that imports the sealed registry for the attempts surface
  // — the three app/api/sprint-labs/attempts*/route.ts handlers stay thin
  // (parse -> auth -> validate -> service -> response, CLAUDE.md's house
  // style) and never import it directly, so they need no entry here.
  //
  // Task 14 (Sable partner): lib/sprint-labs/partner/resolve-mode.server.ts
  // is the ONLY importer for the chat surface, for the same reason —
  // app/api/sprint-labs/chat/route.ts stays thin and never imports
  // loadSealedTicket directly. Kept out of lib/sprint-labs/partner/modes.ts
  // (the pure resolver) deliberately: that file's TYPES must stay safe for a
  // "use client" component (PartnerChat.tsx) to import, and
  // registry.server.ts throws at module-load time in a browser.
  const ALLOWED_IMPORTERS = new Set<string>([
    "lib/sprint-labs/grading/attempts-service.ts",
    "lib/sprint-labs/partner/resolve-mode.server.ts",
  ])

  it("only the whitelisted server-side modules import the sealed sprint-labs registry loader", () => {
    const importers = grepImporters("scenarios/sealed/sprint-labs/registry.server").filter(
      (path) => !path.includes("__tests__") && !path.startsWith("lib/scenarios/sealed/")
    )
    for (const importer of importers) {
      expect(
        ALLOWED_IMPORTERS.has(importer),
        `${importer} imports the sealed sprint-labs registry`
      ).toBe(true)
    }
  })

  it("no client component imports any sealed sprint-labs module (alias OR relative path)", () => {
    const importers = grepImporters("sealed/sprint-labs/[a-zA-Z0-9_/-]+\\.server").filter(
      (path) => !path.includes("__tests__") && !path.startsWith("lib/scenarios/sealed/")
    )
    for (const importer of importers) {
      const contents = readFileSync(join(ROOT, importer), "utf8")
      expect(
        contents.includes('"use client"'),
        `${importer} is a client component importing sealed content`
      ).toBe(false)
    }
  })
})

describe("Sealing test 3 — the compiled public bundle never reaches into the sealed tree", () => {
  it("no file under lib/sprint-labs/content imports anything from lib/scenarios/sealed", () => {
    const publicFiles = listFilesRecursive(PUBLIC_DIR).filter((f) => f.endsWith(".ts"))
    expect(publicFiles.length).toBeGreaterThan(0)
    for (const file of publicFiles) {
      const content = readFileSync(file, "utf8")
      expect(content, `${file} imports from the sealed tree`).not.toMatch(/scenarios\/sealed/)
    }
  })
})

describe("Sealing test 4 — no sealed marker's TEXT leaks into a public file (I-4, content overlap)", () => {
  it("none of the committed public files contain any sealed reference.diff / review body / probe body / io-case expected", async () => {
    const markers = await collectSealedMarkers()
    expect(markers.length).toBeGreaterThan(0)
    const violations = scanPublicFilesForMarkers(PUBLIC_DIR, markers)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  it("RED CASE: the scan actually catches a marker planted under an innocuous public key", async () => {
    const markers = await collectSealedMarkers()
    const smuggledMarker = markers.find((m) => m.length > 8)
    expect(smuggledMarker).toBeTruthy()

    const publicFiles = listFilesRecursive(PUBLIC_DIR).filter((f) => f.endsWith(".ts"))
    const target = publicFiles[0]
    const original = readFileSync(target, "utf8")
    try {
      // Simulates a bug that copies a sealed value into a harmless-looking
      // public field (e.g. bodyMd) — no secret-classified KEY is
      // introduced, only secret TEXT, which is exactly what
      // assertPublicSafe's key-based walk cannot see.
      writeFileSync(target, `${original}\n// smuggled: ${smuggledMarker}\n`)
      const violations = scanPublicFilesForMarkers(PUBLIC_DIR, markers)
      expect(violations.some((v) => v.file === target && v.marker === smuggledMarker)).toBe(true)
    } finally {
      writeFileSync(target, original)
    }
  })
})
