/**
 * Redirect-safety contract for the sign-in return trip.
 *
 * The bug this pins: `proxy.ts` writes `?redirect=/learn/python/...` WITH a leading
 * slash, and every consumer used to do `router.push(`/${redirect}`)`. That produced
 * `//learn/python/...`, which is a protocol-relative URL that browsers resolve as the
 * host `learn`. Two consequences: the return-to-lesson trip silently broke, and
 * `/login?redirect=/evil.example` walked a visitor off-site BEFORE authentication.
 *
 * `resolveSafeRedirect` is now the only thing allowed to produce a value for
 * `router.push`, so the attack table below is the real gate. Do not relax it.
 */

import { beforeEach, describe, expect, it } from "vitest"

import {
  DEFAULT_REDIRECT_PATH,
  getStoredRedirectPath,
  isValidRedirectPath,
  resolveSafeRedirect,
  storeRedirectPath,
} from "@/lib/auth"

describe("resolveSafeRedirect - hostile input", () => {
  // Every one of these must land on the dashboard rather than anywhere the
  // attacker chose. Grouped by the trick each one is playing.
  const hostileInputs: ReadonlyArray<readonly [label: string, input: string]> = [
    ["protocol-relative", "//evil.example"],
    ["protocol-relative with path", "//evil.example/steal"],
    ["backslash treated as a separator by browsers", "/\\evil.example"],
    ["double backslash", "\\\\evil.example"],
    ["absolute https URL", "https://evil.example"],
    ["absolute http URL", "http://evil.example/dashboard"],
    ["scheme-only javascript URL", "javascript:alert(1)"],
    ["javascript URL with a leading slash", "/javascript:alert(1)"],
    ["data URL", "data:text/html,<script>alert(1)</script>"],
    ["path traversal out of an allowed prefix", "/learn/../admin"],
    ["bare traversal", "../etc/passwd"],
    ["many leading slashes", "////x"],
    ["many leading slashes onto an allowed segment", "////dashboard"],
    ["percent-encoded protocol-relative", "/%2F%2Fevil.example"],
    ["percent-encoded backslash", "/%5Cevil.example"],
    ["percent-encoded scheme separator", "/javascript%3Aalert(1)"],
    ["malformed percent escape", "/dashboard/%E0%A4%A"],
    ["tab-smuggled scheme", "java\tscript:alert(1)"],
    ["newline-smuggled scheme", "/dash\nboard"],
    ["null byte in the middle of an allowed segment", "/dash\u0000board"],
    ["null byte before a traversal", "/dashboard\u0000/../evil"],
    ["segment not on the whitelist", "/evil.example"],
    ["whitelist prefix that is not a segment", "/dashboardevil"],
    ["userinfo trick", "/@evil.example"],
    ["bare root", "/"],
    ["query only", "?next=/evil.example"],
  ]

  it.each(hostileInputs)("falls back to the dashboard for %s", (_label, input) => {
    expect(resolveSafeRedirect(input)).toBe(DEFAULT_REDIRECT_PATH)
    expect(isValidRedirectPath(input)).toBe(false)
  })

  it("never returns a value that a browser would read as another origin", () => {
    for (const [, input] of hostileInputs) {
      const resolved = resolveSafeRedirect(input)
      expect(resolved.startsWith("/")).toBe(true)
      expect(resolved.startsWith("//")).toBe(false)
      expect(new URL(resolved, "https://codesparring.dev").origin).toBe("https://codesparring.dev")
    }
  })
})

describe("resolveSafeRedirect - empty input", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace only", "   "],
  ] as ReadonlyArray<readonly [string, string | null | undefined]>)(
    "falls back to the dashboard for %s",
    (_label, input) => {
      expect(resolveSafeRedirect(input)).toBe(DEFAULT_REDIRECT_PATH)
      expect(isValidRedirectPath(input)).toBe(false)
    }
  )
})

describe("resolveSafeRedirect - legitimate destinations", () => {
  it("preserves a deep Learn workspace path intact", () => {
    // The exact shape proxy.ts emits for a gated lesson. This is the funnel:
    // search -> public lesson -> sign in -> workspace.
    const workspacePath = "/learn/python/foundations/py-l1-hello/workspace"
    expect(resolveSafeRedirect(workspacePath)).toBe(workspacePath)
    expect(isValidRedirectPath(workspacePath)).toBe(true)
  })

  it("accepts the slash-less legacy form and adds the leading slash", () => {
    // components/SignupPrompt.tsx and the guest-migration path still write this shape.
    expect(resolveSafeRedirect("sessions/abc")).toBe("/sessions/abc")
    expect(resolveSafeRedirect("dashboard")).toBe("/dashboard")
    expect(resolveSafeRedirect("interview")).toBe("/interview")
  })

  it("preserves mixed-case identifiers", () => {
    // Firestore auto-ids are mixed case; lowercasing the path would 404 them.
    expect(resolveSafeRedirect("/sessions/AbC123xYz")).toBe("/sessions/AbC123xYz")
  })

  it("preserves a query string and a hash", () => {
    expect(resolveSafeRedirect("/interview?message=trial-used")).toBe(
      "/interview?message=trial-used"
    )
    expect(resolveSafeRedirect("/learn/sql#joins")).toBe("/learn/sql#joins")
    expect(resolveSafeRedirect("/learn/sql?a=1#joins")).toBe("/learn/sql?a=1#joins")
  })

  it("normalizes a trailing slash", () => {
    expect(resolveSafeRedirect("/learn/python/")).toBe("/learn/python")
  })

  it("is idempotent, so re-resolving an already-resolved value is a no-op", () => {
    // Several call sites resolve, store, then resolve again on the way out.
    for (const input of [
      "/learn/python/foundations/py-l1-hello/workspace",
      "sessions/abc",
      "//evil.example",
      null,
    ]) {
      const once = resolveSafeRedirect(input)
      expect(resolveSafeRedirect(once)).toBe(once)
    }
  })

  it("covers every first segment the app links to from /login", () => {
    // Regression guard: these are the `?redirect=` values that call sites in the
    // repo actually emit. A segment missing from the whitelist would silently
    // dump the user on the dashboard instead of returning them to their page.
    const linkedDestinations = [
      "/dashboard",
      "/admin",
      "/interview",
      "/practice",
      "/sessions",
      "/roadmap/new",
      "/knowledge",
      "/learn/python",
      "/learn/sql",
      "/learn/system-design",
      "/labs/palantir-fdse",
      "/interview-prep/palantir",
      "/metrics",
      "/upgrade",
      "/limit-reached",
    ]
    for (const destination of linkedDestinations) {
      expect(resolveSafeRedirect(destination)).toBe(destination)
    }
  })
})

describe("storeRedirectPath / getStoredRedirectPath round trip", () => {
  // lib/auth.ts reads bare `window` and `localStorage`, so stand up the minimum
  // both functions touch rather than pulling in a full DOM environment.
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    const fakeLocalStorage = {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => void store.set(key, value),
      removeItem: (key: string): void => void store.delete(key),
    }
    Object.assign(globalThis, { window: { localStorage: fakeLocalStorage } })
    Object.assign(globalThis, { localStorage: fakeLocalStorage })
  })

  it("round-trips the same normalized leading-slash form it was given", () => {
    const workspacePath = "/learn/python/foundations/py-l1-hello/workspace"
    storeRedirectPath(workspacePath)
    expect(store.get("auth_redirect")).toBe(workspacePath)
    expect(getStoredRedirectPath()).toBe(workspacePath)
  })

  it("normalizes the legacy slash-less form on the way in", () => {
    // So no caller downstream is ever tempted to re-prefix it.
    storeRedirectPath("sessions/abc")
    expect(store.get("auth_redirect")).toBe("/sessions/abc")
  })

  it("normalizes a legacy value written to localStorage by another call site", () => {
    // components/SignupPrompt.tsx writes `auth_redirect` directly, bypassing the setter.
    store.set("auth_redirect", "sessions/abc")
    expect(getStoredRedirectPath()).toBe("/sessions/abc")
  })

  it("clears the stored value after reading it", () => {
    storeRedirectPath("/dashboard")
    expect(getStoredRedirectPath()).toBe("/dashboard")
    expect(store.has("auth_redirect")).toBe(false)
    expect(getStoredRedirectPath()).toBeNull()
  })

  it("refuses to store a hostile destination", () => {
    storeRedirectPath("//evil.example")
    storeRedirectPath("https://evil.example")
    storeRedirectPath(null)
    expect(store.has("auth_redirect")).toBe(false)
  })

  it("returns null rather than a hostile value tampered into localStorage", () => {
    store.set("auth_redirect", "//evil.example")
    expect(getStoredRedirectPath()).toBeNull()
  })

  it("returns null when nothing is stored", () => {
    expect(getStoredRedirectPath()).toBeNull()
  })
})
