/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSessionRestore } from "../useSessionRestore"
const read = vi.hoisted(() => vi.fn())
vi.mock("@/lib/firestore-helpers", () => ({ getSessionState: read }))
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }))

function options() {
  return {
    firebaseUser: { uid: "u" },
    isGuestMode: false,
    guestId: null,
    selectedScenario: { id: "task" },
    searchParams: new URLSearchParams(),
    isInterviewStarted: false,
    selectedLanguage: "python",
    router: { push: vi.fn() },
    setCurrentSessionId: vi.fn(),
    setCode: vi.fn(),
    setChatMessages: vi.fn(),
    setInterviewerMessages: vi.fn(),
    setSelectedLanguage: vi.fn(),
    setTestResults: vi.fn(),
    setWorkspaceContext: vi.fn(),
    setActiveWorkspacePath: vi.fn(),
    setConsoleLogs: vi.fn(),
    setBugfixEvidenceEvents: vi.fn(),
    setElapsedTime: vi.fn(),
    setTestSummary: vi.fn(),
    setShowPostInterviewDiscussion: vi.fn(),
    setIsInterviewStarted: vi.fn(),
    setShowScenarioBrowser: vi.fn(),
    recordedBugfixEditPathsRef: { current: new Set<string>() },
    onSessionRestored: vi.fn(),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  const local = {
    sessionId: "existing-attempt",
    timestamp: Date.now(),
    code: "",
    selectedLanguage: "python",
    elapsedTime: 12,
    chatMessages: [{ type: "user", message: "partner question" }],
    interviewerMessages: [{ type: "ai", message: "interviewer reply" }],
    chatInput: "unsent",
  }
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(local), removeItem: vi.fn() })
  read.mockResolvedValue({ code: "stale", savedAt: new Date(Date.now() - 1000).toISOString() })
  window.history.replaceState({}, "", "/interview")
})
describe("saved attempt selected without a URL", () => {
  it("opens the same attempt paused, preserving an empty buffer, history and draft", async () => {
    const opts = options()
    renderHook(() => useSessionRestore(opts as never))
    await waitFor(() => expect(opts.onSessionRestored).toHaveBeenCalled())
    expect(opts.setCurrentSessionId).toHaveBeenCalledWith("existing-attempt")
    expect(opts.setCode).toHaveBeenCalledWith("")
    expect(opts.setChatMessages).toHaveBeenCalledWith([
      { type: "user", message: "partner question" },
    ])
    expect(opts.onSessionRestored).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "existing-attempt", chatInput: "unsent" })
    )
    expect(window.location.search).toContain("session=existing-attempt")
  })
  it("lets the authoritative completed state win over unsynced local work", async () => {
    read.mockResolvedValue({ completedAt: "done" })
    const opts = options()
    renderHook(() => useSessionRestore(opts as never))
    await waitFor(() => expect(opts.router.push).toHaveBeenCalledWith("/sessions/existing-attempt"))
    expect(opts.setCode).not.toHaveBeenCalled()
  })
})
