import { describe, expect, it } from "vitest"
import { buildTestApp } from "../support/build-app"

describe("GET /health", () => {
  it("returns ok", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({ method: "GET", url: "/health" })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: "ok" })
  })
})
