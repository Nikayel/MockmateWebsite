import { describe, expect, it } from "vitest"
import { serializeCheckpoint } from "./checkpoint"

describe("Firestore checkpoint serialization", () => {
  it("supports partial guest checkpoints without inventing a strict deadline or code", () => {
    const checkpoint = serializeCheckpoint({ chatInput: "unsent question" })
    expect(checkpoint.chat_input).toBe("unsent question")
    expect(checkpoint).not.toHaveProperty("code")
    expect(checkpoint).not.toHaveProperty("strict_deadline_at")
    expect(checkpoint).toStrictEqual(JSON.parse(JSON.stringify(checkpoint)))
  })
  it("omits optional undefined values recursively instead of rejecting the whole save", () => {
    const checkpoint = serializeCheckpoint(
      {
        code: "edit",
        selectedLanguage: "python",
        elapsedTime: 12,
        chatMessages: [{ type: "user", message: "why?", timestamp: undefined }],
        workspaceContext: [{ path: "main.py", content: "edit", description: undefined }],
      },
      []
    )
    expect(checkpoint).not.toHaveProperty("bugfix_hypothesis")
    expect(checkpoint.chat_messages).toEqual([{ type: "user", message: "why?" }])
    expect(checkpoint.workspace_context).toEqual([{ path: "main.py", content: "edit" }])
  })
})
