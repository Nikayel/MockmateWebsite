// Helper to transpile TS client-side (calls transpile API endpoint)
export async function transpileIfNeeded(code: string, language: string): Promise<string> {
  if (language !== "typescript") {
    return code
  }

  try {
    const response = await fetch("/api/transpile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || "Transpilation failed")
    }

    const data = await response.json()
    return data.code
  } catch (error) {
    throw new Error(
      `TypeScript Transpilation Error: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
