import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { updateSessionLifecycle } from "@/lib/interview/session-lifecycle/server"

const schema = z.object({
  sessionId: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[\w-]+$/),
  ownerId: z.string().uuid(),
  action: z.enum(["activate", "heartbeat", "pause"]),
  lastActivityAt: z.number().finite().nonnegative(),
  manual: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid session activity" }, { status: 400 })
    const result = await updateSessionLifecycle({ ...parsed.data, userId: auth.userId })
    return NextResponse.json({ ok: result.status === 200 }, { status: result.status })
  } catch {
    return NextResponse.json({ error: "Could not update session activity" }, { status: 503 })
  }
}
