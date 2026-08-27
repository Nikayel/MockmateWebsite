import { describe, expect, it } from "vitest"
import { compatibilityDescriptor } from "../../../src/http/compatibility-descriptor"

describe("compatibilityDescriptor", () => {
  it("marks page and per_page as deprecated, not removed, on v1", () => {
    const v1 = compatibilityDescriptor("v1")
    expect(v1.parameters.page.status).toBe("deprecated")
    expect(v1.parameters.per_page.status).toBe("deprecated")
  })

  it("does not list page or per_page for v2 at all", () => {
    const v2 = compatibilityDescriptor("v2")
    expect(v2.parameters.page).toBeUndefined()
    expect(v2.parameters.per_page).toBeUndefined()
  })
})
