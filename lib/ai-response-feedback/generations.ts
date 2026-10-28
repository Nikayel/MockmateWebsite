import "server-only"
import { createHash } from "node:crypto"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { responseIdentitySchema, type ResponseRating } from "./contract"

interface GenerationOutput {
  id: string
  contentHash: string
  source?: string
  level?: number
  feedback?: { value: ResponseRating; updatedAt: string; labelSource: "user" }
}
interface ResponseGeneration {
  schemaVersion: 1
  userId: string
  kind: "partner" | "interviewer" | "hint"
  sessionId?: string
  scenarioId?: string
  createdAt: string
  outputs: GenerationOutput[]
}

export class ResponseFeedbackError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
  }
}

/** One logical reply or hint batch; hashes identify exact output without duplicating chat/code. */
export async function registerResponseGeneration(input: {
  generationId: string
  userId: string
  kind: ResponseGeneration["kind"]
  sessionId?: string
  scenarioId?: string
  outputs: Array<{ id: string; content: string; source?: string; level?: number }>
}): Promise<boolean> {
  try {
    const outputs = input.outputs.map(({ content, ...output }) => {
      responseIdentitySchema.parse({ generationId: input.generationId, responseId: output.id })
      return { ...output, contentHash: createHash("sha256").update(content).digest("hex") }
    })
    if (
      !outputs.length ||
      outputs.length > 32 ||
      new Set(outputs.map((output) => output.id)).size !== outputs.length
    )
      throw new Error("Invalid response count")
    // A request may carry an untrusted session ID. Never attach another learner's session.
    let ownedSessionId: string | undefined
    const sessionId = responseIdentitySchema.shape.responseId.safeParse(input.sessionId)
    const scenarioId = responseIdentitySchema.shape.responseId.safeParse(input.scenarioId)
    if (sessionId.success) {
      const session = await adminDb.collection("interview_sessions").doc(sessionId.data).get()
      if (session.get("user_id") === input.userId) ownedSessionId = sessionId.data
    }
    const generation: ResponseGeneration = {
      schemaVersion: 1,
      userId: input.userId,
      kind: input.kind,
      createdAt: new Date().toISOString(),
      ...(ownedSessionId ? { sessionId: ownedSessionId } : {}),
      ...(scenarioId.success ? { scenarioId: scenarioId.data } : {}),
      outputs,
    }
    await adminDb.collection("ai_response_generations").doc(input.generationId).create(generation)
    return true
  } catch (error) {
    logger.warn("[Response feedback] Could not register generation", {
      generationId: input.generationId,
      error,
    })
    return false
  }
}

/** A transaction preserves sibling hint ratings and makes a repeated identical rating a no-op. */
export async function responseFeedback(
  userId: string,
  generationId: string,
  responseId: string,
  value?: ResponseRating
): Promise<ResponseRating | null> {
  responseIdentitySchema.parse({ generationId, responseId })
  const ref = adminDb.collection("ai_response_generations").doc(generationId)
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const generation = snapshot.data() as ResponseGeneration | undefined
    if (!generation || generation.userId !== userId)
      throw new ResponseFeedbackError("Response not found", 404)
    const output = generation.outputs.find((entry) => entry.id === responseId)
    if (!output || generation.kind === "interviewer")
      throw new ResponseFeedbackError("Response not found", 404)
    if (value && output.feedback?.value !== value) {
      output.feedback = { value, updatedAt: new Date().toISOString(), labelSource: "user" }
      transaction.update(ref, { outputs: generation.outputs })
    }
    return output.feedback?.value ?? null
  })
}
