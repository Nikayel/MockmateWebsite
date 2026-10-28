import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { ragRateLimit } from "@/lib/rate-limiting"
import { handleRecordFeedback, handleReadFeedback } from "@/lib/rag/actions/record-feedback"

async function handle(request: NextRequest, write: boolean) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId)
    return NextResponse.json({ error: "Sign in to rate responses" }, { status: 401 })
  const limited = await ragRateLimit(request)
  if (limited) return limited
  let input: unknown
  try {
    input = write ? await request.json() : Object.fromEntries(new URL(request.url).searchParams)
  } catch {
    return NextResponse.json({ error: "Invalid feedback request" }, { status: 400 })
  }
  return write ? handleRecordFeedback(input, auth.userId) : handleReadFeedback(input, auth.userId)
}

export const GET = (request: NextRequest) => handle(request, false)
export const POST = (request: NextRequest) => handle(request, true)
