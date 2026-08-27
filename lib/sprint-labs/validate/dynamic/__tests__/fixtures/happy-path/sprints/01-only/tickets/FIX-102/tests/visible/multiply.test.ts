import { describe, expect, it } from "vitest"
import { multiply } from "../../../src/multiply"

describe("multiply", () => {
  it("multiplies 3 by 4 to get 12", () => {
    expect(multiply(3, 4)).toBe(12)
  })
})
