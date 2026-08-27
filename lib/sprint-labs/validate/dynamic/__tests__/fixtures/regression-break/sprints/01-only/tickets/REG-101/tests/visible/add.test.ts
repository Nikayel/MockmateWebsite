import { describe, expect, it } from "vitest"
import { add } from "../../../src/math"

describe("add", () => {
  it("adds a negative and a positive number", () => {
    expect(add(5, -3)).toBe(2)
  })
})
