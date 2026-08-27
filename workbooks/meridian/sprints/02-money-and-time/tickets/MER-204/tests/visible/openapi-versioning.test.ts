import { describe, expect, it } from "vitest"
import { findContractDrift, generateOpenApiDocument } from "../../src/http/openapi"
import { buildTestApp } from "../../test/support/build-app"

describe("generateOpenApiDocument versioning", () => {
  it("defaults to the v1 document when no version is given, unchanged from before this ticket", () => {
    const withNoArg = generateOpenApiDocument()
    const withExplicitV1 = generateOpenApiDocument("v1")
    expect(withNoArg).toEqual(withExplicitV1)
  })

  it("states offset as deprecated in the v1 document", () => {
    const doc = generateOpenApiDocument("v1")
    const offsetParam = doc.paths["/claims"]?.get?.parameters.find(
      (parameter) => parameter.name === "offset"
    )
    expect(offsetParam?.deprecated).toBe(true)
  })

  it("states no offset parameter at all in the v2 document", () => {
    const doc = generateOpenApiDocument("v2")
    const names = doc.paths["/claims"]?.get?.parameters.map((parameter) => parameter.name)
    expect(names).not.toContain("offset")
  })

  it("states both the v1 and v2 parameter lists correctly from the same source of truth", () => {
    const v1Doc = generateOpenApiDocument("v1")
    const v2Doc = generateOpenApiDocument("v2")
    const v1Names = v1Doc.paths["/claims"]?.get?.parameters.map((parameter) => parameter.name)
    const v2Names = v2Doc.paths["/claims"]?.get?.parameters.map((parameter) => parameter.name)
    expect(v1Names).toEqual(["cursor", "limit", "offset"])
    expect(v2Names).toEqual(["cursor", "limit"])
  })

  it("leaves every other operation's document identical between v1 and v2", () => {
    const v1Doc = generateOpenApiDocument("v1")
    const v2Doc = generateOpenApiDocument("v2")
    expect(v1Doc.paths["/claims/{id}"]).toEqual(v2Doc.paths["/claims/{id}"])
  })

  it("still agrees with the live route table now that GET /claims has two versions", () => {
    const { meridian } = buildTestApp()
    expect(findContractDrift(meridian.app)).toEqual([])
  })
})
