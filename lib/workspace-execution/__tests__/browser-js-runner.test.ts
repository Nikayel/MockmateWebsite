import { describe, expect, it } from "vitest"
import { POST } from "@/app/api/transpile/route"
import { NextRequest } from "next/server"
import { stripComments } from "../browser-js-runner"

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

describe("stripComments", () => {
  it("strips JavaScript comments correctly", () => {
    const code = `
      // This is a comment
      const x = 42; // Inline comment
      /* Block comment */
      const y = "hello // not a comment";
    `
    const cleaned = stripComments(code, "javascript")
    expect(cleaned).not.toContain("This is a comment")
    expect(cleaned).not.toContain("Inline comment")
    expect(cleaned).not.toContain("Block comment")
    expect(cleaned).toContain('const y = "hello // not a comment";')
  })

  it("strips Python comments correctly", () => {
    const code = `
      # This is a python comment
      x = 42 # Inline python comment
      """Triple quote docstring"""
      y = "hello # not a comment"
    `
    const cleaned = stripComments(code, "python")
    expect(cleaned).not.toContain("This is a python comment")
    expect(cleaned).not.toContain("Inline python comment")
    expect(cleaned).not.toContain("Triple quote docstring")
    expect(cleaned).toContain('y = "hello # not a comment"')
  })
})
