import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { generateOpenApiDocument, findContractDrift } from "../../src/http/openapi"

describe("generateOpenApiDocument", () => {
  it("describes every query parameter the list endpoint accepts today", () => {
    const doc = generateOpenApiDocument()
    const names = doc.paths["/claims"]?.get?.parameters.map((parameter) => parameter.name)
    expect(names).toContain("cursor")
    expect(names).toContain("limit")
  })

  it("marks a sunsetting parameter deprecated in the document, never silently removed", () => {
    const doc = generateOpenApiDocument()
    const offsetParam = doc.paths["/claims"]?.get?.parameters.find(
      (parameter) => parameter.name === "offset"
    )
    expect(offsetParam?.deprecated).toBe(true)
  })

  it("agrees with the live route table instead of a hand-maintained list", () => {
    const { meridian } = buildTestApp()
    expect(findContractDrift(meridian.app)).toEqual([])
  })
})

describe("GET /openapi.json", () => {
  it("serves the exact document generateOpenApiDocument returns", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({ method: "GET", url: "/openapi.json" })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(generateOpenApiDocument())
  })
})

describe("GET /claims deprecation headers", () => {
  it("stamps Deprecation and Sunset when a caller still sends offset", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims?offset=0",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    expect(response.headers.deprecation).toBe("true")
    expect(typeof response.headers.sunset).toBe("string")
  })

  it("stamps nothing when a caller only uses the current cursor parameter", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    expect(response.headers.deprecation).toBeUndefined()
    expect(response.headers.sunset).toBeUndefined()
  })
})
