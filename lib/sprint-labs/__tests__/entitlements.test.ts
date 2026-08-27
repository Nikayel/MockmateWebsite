import { describe, expect, it } from "vitest"
import { sprintRequiresPro } from "../entitlements"

describe("sprintRequiresPro", () => {
  it("sprint 1 is free", () => {
    expect(sprintRequiresPro(1)).toBe(false)
  })

  it("every sprint after 1 requires Pro", () => {
    for (const n of [2, 3, 5, 10]) {
      expect(sprintRequiresPro(n)).toBe(true)
    }
  })
})
