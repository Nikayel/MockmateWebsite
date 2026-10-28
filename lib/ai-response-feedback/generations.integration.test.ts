import { randomUUID, createHash } from "node:crypto"
import { afterEach, beforeAll, expect, it } from "vitest"
import { adminDb } from "@/lib/firebase-admin"
import { registerResponseGeneration, responseFeedback } from "./generations"

const created: FirebaseFirestore.DocumentReference[] = []
beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/^(localhost|127\.0\.0\.1):\d+$/)
  expect(adminDb.projectId).toBe("codesparring-integration")
})
afterEach(async () => {
  await Promise.all(created.splice(0).map((ref) => ref.delete()))
})
async function generation(
  kind: "partner" | "hint" | "interviewer" = "partner",
  sessionId?: string
) {
  const generationId = randomUUID()
  const ref = adminDb.collection("ai_response_generations").doc(generationId)
  created.push(ref)
  expect(
    await registerResponseGeneration({
      generationId,
      userId: "rating-owner",
      kind,
      ...(sessionId ? { sessionId } : {}),
      scenarioId: "scenario",
      outputs: [
        { id: "first", content: "Inspect the boundary" },
        { id: "second", content: "Try the empty case" },
      ],
    })
  ).toBe(true)
  return { generationId, ref }
}

it("persists exact-response feedback, reloads it, and treats repeated delivery as a no-op", async () => {
  const { generationId, ref } = await generation()
  expect(await responseFeedback("rating-owner", generationId, "first")).toBeNull()
  expect(await responseFeedback("rating-owner", generationId, "first", "helpful")).toBe("helpful")
  const once = (await ref.get()).data()
  await responseFeedback("rating-owner", generationId, "first", "helpful")
  expect((await ref.get()).data()).toEqual(once)
  expect(await responseFeedback("rating-owner", generationId, "first")).toBe("helpful")
  await responseFeedback("rating-owner", generationId, "first", "unhelpful")
  expect(await responseFeedback("rating-owner", generationId, "first")).toBe("unhelpful")
  expect(once?.outputs[0].contentHash).toBe(
    createHash("sha256").update("Inspect the boundary").digest("hex")
  )
  expect(JSON.stringify(once)).not.toContain("Inspect the boundary")
})

it("keeps concurrent hint ratings and new generations independent", async () => {
  const first = await generation("hint")
  const second = await generation("hint")
  await Promise.all([
    responseFeedback("rating-owner", first.generationId, "first", "helpful"),
    responseFeedback("rating-owner", first.generationId, "second", "unhelpful"),
  ])
  expect(await responseFeedback("rating-owner", first.generationId, "first")).toBe("helpful")
  expect(await responseFeedback("rating-owner", first.generationId, "second")).toBe("unhelpful")
  expect(await responseFeedback("rating-owner", second.generationId, "first")).toBeNull()
})

it("refuses foreign, unknown and interviewer responses without changing the stored generation", async () => {
  const { generationId, ref } = await generation()
  const before = (await ref.get()).data()
  await expect(
    responseFeedback("another-owner", generationId, "first", "helpful")
  ).rejects.toMatchObject({ status: 404 })
  await expect(
    responseFeedback("rating-owner", generationId, "invented", "helpful")
  ).rejects.toMatchObject({ status: 404 })
  const interviewer = await generation("interviewer")
  await expect(
    responseFeedback("rating-owner", interviewer.generationId, "first", "helpful")
  ).rejects.toMatchObject({ status: 404 })
  expect((await ref.get()).data()).toEqual(before)
})

it("attaches only an owned session and never overwrites an existing generation", async () => {
  const sessionId = `rating-session-${randomUUID()}`
  const session = adminDb.collection("interview_sessions").doc(sessionId)
  created.push(session)
  await session.set({ user_id: "another-owner" })
  const unowned = await generation("partner", sessionId)
  expect((await unowned.ref.get()).get("sessionId")).toBeUndefined()
  await session.update({ user_id: "rating-owner" })
  const owned = await generation("partner", sessionId)
  expect((await owned.ref.get()).get("sessionId")).toBe(sessionId)
  expect(
    await registerResponseGeneration({
      generationId: owned.generationId,
      userId: "another-owner",
      kind: "partner",
      outputs: [{ id: "first", content: "overwrite" }],
    })
  ).toBe(false)
  expect((await owned.ref.get()).get("userId")).toBe("rating-owner")
})
