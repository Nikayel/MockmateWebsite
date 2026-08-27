import { describe, expect, it } from "vitest"
import { double } from "../../../src/util"

describe("double", () => {
  it("doubles a number", () => {
    expect(double(3)).toBe(6)
  })
})
