import { NextRequest, NextResponse } from "next/server"
import ts from "typescript"
import { executeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

// ts.transpileModule is CPU-bound; cap input so a single request cannot pin a
// worker. Matches the 100KB limit used by /api/execute.
const MAX_CODE_LENGTH = 100_000

export async function POST(request: NextRequest) {
  // IP-based rate limit — guests may transpile TS in the editor, so no auth is
  // required, but unbounded/looping requests must be throttled.
  const rateLimitResponse = await executeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await request.json()
    const { code } = body

    if (typeof code !== "string") {
      return NextResponse.json({ error: "Invalid or missing code parameter" }, { status: 400 })
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: "Code exceeds maximum length" }, { status: 400 })
    }

    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    })

    return NextResponse.json({ code: transpiled.outputText })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transpilation failed" },
      { status: 500 }
    )
  }
}
