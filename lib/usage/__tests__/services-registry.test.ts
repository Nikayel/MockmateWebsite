/**
 * Registry guard for the usage service vocabulary.
 *
 * The registry is only worth having if it cannot drift: ids must stay unique
 * and Firestore-safe, every registered id must have a real call site (an
 * entry nothing writes is a lie in the admin breakdown), and the legacy
 * eventType mapping must stay inside the registry. Same shape as the
 * curriculum ticket-registry test: a central allocator plus a bijection
 * check against the live corpus, so a new call site cannot quietly opt out
 * and a dead entry cannot quietly linger.
 */

import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import {
  LEGACY_EVENT_TYPE_SERVICE,
  SYSTEM_USER_ID,
  UNATTRIBUTED_SERVICE,
  USAGE_SERVICES,
  USAGE_SERVICE_IDS,
  isUsageServiceId,
} from "../services"

// Kebab-case, no dots: a dotted id inside a Firestore field path
// ("costByService.a.b") splits into nested map fields and corrupts rollups.
const ID_SHAPE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const REPO_ROOT = join(__dirname, "..", "..", "..")
const SCAN_ROOTS = ["app", "lib", "components"]
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"])
const REGISTRY_FILE = join(REPO_ROOT, "lib", "usage", "services.ts")
const THIS_FILE = join(REPO_ROOT, "lib", "usage", "__tests__", "services-registry.test.ts")

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      yield* walk(full)
    } else if (SCAN_EXTENSIONS.has(full.slice(full.lastIndexOf(".")))) {
      yield full
    }
  }
}

function liveCorpus(): string {
  let corpus = ""
  for (const root of SCAN_ROOTS) {
    for (const file of walk(join(REPO_ROOT, root))) {
      if (file === REGISTRY_FILE || file === THIS_FILE) continue
      corpus += readFileSync(file, "utf8")
    }
  }
  return corpus
}

describe("usage service registry", () => {
  it("ids are unique", () => {
    expect(new Set(USAGE_SERVICE_IDS).size).toBe(USAGE_SERVICE_IDS.length)
  })

  it("ids are kebab-case with no dots (Firestore field-path safety)", () => {
    for (const id of USAGE_SERVICE_IDS) {
      expect(id, `service id "${id}" is not field-path safe`).toMatch(ID_SHAPE)
      expect(id).not.toContain(".")
    }
  })

  it("every entry has a non-empty human label", () => {
    for (const service of USAGE_SERVICES) {
      expect(service.label.trim().length, `label for "${service.id}"`).toBeGreaterThan(0)
    }
  })

  it("reserved sentinels are not registered services", () => {
    expect(isUsageServiceId(SYSTEM_USER_ID)).toBe(false)
    expect(isUsageServiceId(UNATTRIBUTED_SERVICE)).toBe(false)
  })

  it("the legacy eventType mapping stays inside the registry", () => {
    for (const [eventType, service] of Object.entries(LEGACY_EVENT_TYPE_SERVICE)) {
      expect(isUsageServiceId(service), `legacy mapping for "${eventType}"`).toBe(true)
    }
    expect(Object.keys(LEGACY_EVENT_TYPE_SERVICE).length).toBeGreaterThan(0)
  })

  it("every registered id is used by a live call site (no dead entries)", () => {
    const corpus = liveCorpus()
    for (const id of USAGE_SERVICE_IDS) {
      const used = corpus.includes(`"${id}"`) || corpus.includes(`'${id}'`)
      expect(
        used,
        `service "${id}" is registered but nothing in app/, lib/ or components/ references it — ` +
          `either wire the call site or remove the entry`
      ).toBe(true)
    }
  })
})
