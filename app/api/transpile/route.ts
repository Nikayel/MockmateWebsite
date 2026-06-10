import { NextRequest, NextResponse } from "next/server"
import ts from "typescript"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (typeof code !== "string") {
      return NextResponse.json({ error: "Invalid or missing code parameter" }, { status: 400 })
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
