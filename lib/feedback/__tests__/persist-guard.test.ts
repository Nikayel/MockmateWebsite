import { describe, it, expect } from "vitest"
import { resolvePersistAction } from "../persist-guard"

describe("resolvePersistAction", () => {
  it("persists when the session has no terminal feedback yet", () => {
    expect(resolvePersistAction({ status: "processing", source: null }, "server")).toBe("persist")
    expect(resolvePersistAction({ status: "pending", source: null }, "stream")).toBe("persist")
    expect(resolvePersistAction({ status: undefined, source: undefined }, "stream")).toBe("persist")
    expect(resolvePersistAction({ status: "failed", source: null }, "server")).toBe("persist")
  })

  it("skips a second persist once real feedback is complete (client/server race)", () => {
    expect(resolvePersistAction({ status: "complete", source: "stream" }, "server")).toBe("skip")
    expect(resolvePersistAction({ status: "complete", source: "server" }, "stream")).toBe("skip")
    // Legacy complete docs have no source stamp; treat them as real feedback.
    expect(resolvePersistAction({ status: "complete", source: null }, "server")).toBe("skip")
  })

  it("lets real feedback upgrade a fallback-scored session", () => {
    expect(resolvePersistAction({ status: "complete", source: "fallback" }, "server")).toBe(
      "persist"
    )
    expect(resolvePersistAction({ status: "complete", source: "fallback" }, "stream")).toBe(
      "persist"
    )
  })

  it("never lets fallback overwrite anything already complete", () => {
    expect(resolvePersistAction({ status: "complete", source: "fallback" }, "fallback")).toBe(
      "skip"
    )
    expect(resolvePersistAction({ status: "complete", source: "stream" }, "fallback")).toBe("skip")
  })
})
