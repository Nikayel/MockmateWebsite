import { describe, expect, it } from "vitest"
import { classify } from "../../../src/classify"

describe("classify", () => {
  it("labels a negative number as negative", () => {
    expect(classify({ n: -5 }).label).toBe("negative")
  })
})
