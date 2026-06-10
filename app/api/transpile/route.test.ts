import { describe, expect, it } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

describe("/api/transpile route", () => {
  it("transpiles TS to JS successfully", async () => {
    const req = new NextRequest("http://localhost/api/transpile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    req.json = async () => ({ code: "const x: number = 42; export {};" })

    const res = await POST(req)
    const json = (res as any).data
    expect((res as any).status).toBe(200)
    expect(json.code).toContain("x = 42;")
  })

  it("returns 400 when code is invalid or missing", async () => {
    const req = new NextRequest("http://localhost/api/transpile", {
      method: "POST",
    })
    req.json = async () => ({})

    const res = await POST(req)
    expect((res as any).status).toBe(400)
  })
})
