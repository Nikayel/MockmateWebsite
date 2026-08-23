// @vitest-environment jsdom
/**
 * Where a voice session reports its Deepgram minutes.
 *
 * The report used to live only inside `stopRecording`, which is the one exit the user has to
 * click. Every other way a recording ends (navigating away mid-sentence, closing the tab, the
 * service hitting its own max-duration ceiling) streamed real, billable audio and wrote no usage
 * event at all. These tests pin the report to the exits themselves, and pin it to firing once.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { VOICE } from "@/lib/constants"

const fakeService = vi.hoisted(() => ({
  startTranscription: vi.fn(async () => {}),
  stopTranscription: vi.fn(() => ""),
  onMaxDuration: null as ((transcript: string) => void) | null,
}))

vi.mock("./deepgram-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./deepgram-service")>()

  class FakeDeepgramVoiceService {
    setAuthTokenProvider() {}
    setOnTranscript() {}
    setOnError() {}
    setOnStatus() {}
    setOnUtteranceEnd() {}
    setMaxDuration() {}
    setOnMaxDuration(callback: (transcript: string) => void) {
      fakeService.onMaxDuration = callback
    }
    startTranscription = fakeService.startTranscription
    stopTranscription = fakeService.stopTranscription
    resetTranscript() {}
    clearSentTracker() {}
    isConfigured() {
      return true
    }
  }

  return { ...actual, DeepgramVoiceService: FakeDeepgramVoiceService }
})

import { buildVoiceUsagePayload, useDeepgram } from "./use-deepgram"

const fetchMock = vi.fn(async () => ({ ok: true }))
let now = 0

/** The body of the single usage POST, parsed. */
function reportedBody(call = 0) {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined
  return JSON.parse(String(init?.body))
}

function renderVoiceHook() {
  return renderHook(() =>
    useDeepgram({ sessionId: "session-1", getAuthToken: async () => "id-token" })
  )
}

/** Start a recording and let `elapsedSeconds` of audio stream. */
async function record(elapsedSeconds: number) {
  const view = renderVoiceHook()
  await act(async () => {
    await view.result.current.startRecording()
  })
  now += elapsedSeconds * 1000
  return view
}

beforeEach(() => {
  now = 1_700_000_000_000
  vi.spyOn(Date, "now").mockImplementation(() => now)
  fetchMock.mockClear()
  fakeService.stopTranscription.mockReturnValue("")
  fakeService.onMaxDuration = null
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useDeepgram usage reporting", () => {
  it("reports the session when the component unmounts mid-recording", async () => {
    fakeService.stopTranscription.mockReturnValue("twelve chars")
    const { unmount } = await record(30)

    unmount()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).toBe("/api/usage/voice")
    expect(reportedBody()).toMatchObject({
      sessionId: "session-1",
      durationSeconds: 30,
      transcriptLength: "twelve chars".length,
    })
  })

  // Navigation tears the document down while the POST is in flight; without keepalive the
  // browser cancels it and the minutes are lost exactly as before.
  it("sends the unmount report with keepalive so it survives the navigation", async () => {
    const { unmount } = await record(30)

    unmount()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.keepalive).toBe(true)
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer id-token")
  })

  it("reports once when the user stops and then navigates away", async () => {
    const view = await record(30)

    act(() => {
      view.result.current.stopRecording()
    })
    view.unmount()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(reportedBody().durationSeconds).toBe(30)
  })

  it("reports nothing when no recording was ever started", async () => {
    const { unmount } = renderVoiceHook()

    unmount()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // The service stops itself at the ceiling and callers gate `stopRecording` on `isRecording`,
  // so nothing else would ever report this session.
  it("reports the session the service auto-stopped at max duration", async () => {
    await record(VOICE.MAX_RECORDING_SECONDS)

    act(() => {
      fakeService.onMaxDuration?.("done")
    })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(reportedBody().durationSeconds).toBe(VOICE.MAX_RECORDING_SECONDS)
  })

  // A session that ended on its own is only discovered at unmount, and the wall clock since it
  // started is not what Deepgram streamed.
  it("never reports more audio than the service could have streamed", async () => {
    const { unmount } = await record(VOICE.MAX_RECORDING_SECONDS * 10)

    unmount()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(reportedBody().durationSeconds).toBe(VOICE.MAX_RECORDING_SECONDS)
  })
})

describe("buildVoiceUsagePayload", () => {
  const base = { startedAt: 0, endedAt: 5000, transcript: "hello", sessionId: "session-1" }

  it("measures the elapsed audio in seconds", () => {
    expect(buildVoiceUsagePayload(base)).toEqual({
      sessionId: "session-1",
      durationSeconds: 5,
      model: "nova-3",
      transcriptLength: 5,
    })
  })

  it("keeps the caller's model when one is given", () => {
    expect(buildVoiceUsagePayload({ ...base, model: "nova-2" })?.model).toBe("nova-2")
  })

  // A mis-click is not billable audio.
  it("declines to report a sub-second recording", () => {
    expect(buildVoiceUsagePayload({ ...base, endedAt: 900 })).toBeNull()
  })

  it("declines to report a corrupt start time", () => {
    expect(buildVoiceUsagePayload({ ...base, startedAt: NaN })).toBeNull()
  })

  it("clamps to the recording ceiling the service enforces", () => {
    const payload = buildVoiceUsagePayload({ ...base, endedAt: 60 * 60 * 1000 })

    expect(payload?.durationSeconds).toBe(VOICE.MAX_RECORDING_SECONDS)
  })
})

/**
 * The browser recognizer is gone and must stay gone.
 *
 * `useVoiceInput` used to accept `fallbackToWebSpeech` and switch to Chrome's
 * SpeechRecognition when Deepgram reported itself unconfigured. Quality was the
 * least of it: /legal tells users audio goes to Deepgram and names Deepgram as
 * the only voice subprocessor, while Chrome implements SpeechRecognition by
 * streaming microphone audio to Google. The fallback sent a user's voice to a
 * company our privacy page does not list, silently, on a path they could not
 * decline.
 *
 * A source-level assertion because there is no behaviour left to test - the
 * point is the ABSENCE of a code path, and absence is what a behavioural test
 * cannot see.
 */
describe("no browser speech fallback", () => {
  const SOURCE = readFileSync(join(process.cwd(), "lib/voice/use-deepgram.ts"), "utf8")
  /** Comments explain why the path was removed; only real code should fail this. */
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

  it("never constructs a browser SpeechRecognition", () => {
    expect(CODE).not.toMatch(/webkitSpeechRecognition|new\s+SpeechRecognition/)
  })

  it("exposes no fallbackToWebSpeech option", () => {
    expect(CODE).not.toContain("fallbackToWebSpeech")
  })

  it("reports deepgram as the only provider", () => {
    expect(CODE).toContain('provider: "deepgram" as const')
    expect(CODE).not.toContain('"web-speech"')
  })
})
