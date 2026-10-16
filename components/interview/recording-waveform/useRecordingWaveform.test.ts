// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRecordingWaveform } from "./useRecordingWaveform"

let amplitude = 0
const analyser = {
  fftSize: 512,
  getFloatTimeDomainData: vi.fn((samples: Float32Array) => samples.fill(amplitude)),
  disconnect: vi.fn(),
}
const source = { connect: vi.fn(), disconnect: vi.fn() }
const context = {
  state: "running",
  createMediaStreamSource: vi.fn(() => source),
  createAnalyser: vi.fn(() => analyser),
  resume: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
}
const createContext = vi.fn(function () {
  return context
})
const getUserMedia = vi.fn()

function recordingStream() {
  const stop = vi.fn()
  const track = Object.assign(new EventTarget(), { stop })
  const stream = { active: true, getAudioTracks: () => [track] } as unknown as MediaStream
  return { stream, track, stop }
}

async function advance(milliseconds = 80) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  amplitude = 0
  context.state = "running"
  context.resume.mockResolvedValue(undefined)
  context.close.mockResolvedValue(undefined)
  vi.stubGlobal("AudioContext", createContext)
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("recording waveform", () => {
  it("uses the recorder's stream and represents sound and silence with measured levels", async () => {
    const { stream } = recordingStream()
    const view = renderHook(() => useRecordingWaveform(stream, false))
    await advance()
    expect(context.createMediaStreamSource).toHaveBeenCalledWith(stream)
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(view.result.current).toEqual(Array(24).fill(0))

    amplitude = 0.12
    await advance()
    expect(view.result.current?.at(-1)).toBeGreaterThan(0.5)

    amplitude = 0
    await advance(24 * 80)
    expect(view.result.current).toEqual(Array(24).fill(0))
    view.unmount()
  })

  it("releases analysis on stop without stopping the recorder-owned tracks", async () => {
    const { stream, stop } = recordingStream()
    const view = renderHook(({ current }) => useRecordingWaveform(current, false), {
      initialProps: { current: stream as MediaStream | null },
    })
    await advance()
    view.rerender({ current: null })
    expect(view.result.current).toBeNull()
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(analyser.disconnect).toHaveBeenCalledOnce()
    expect(context.close).toHaveBeenCalledOnce()
    expect(stop).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("cleans up on unmount", async () => {
    const { stream, stop } = recordingStream()
    const view = renderHook(() => useRecordingWaveform(stream, false))
    await advance()
    view.unmount()
    expect(context.close).toHaveBeenCalledOnce()
    expect(stop).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("stops analysis immediately when the microphone track ends", async () => {
    const { stream, track } = recordingStream()
    const view = renderHook(() => useRecordingWaveform(stream, false))
    await advance()
    act(() => track.dispatchEvent(new Event("ended")))
    expect(view.result.current).toBeNull()
    expect(context.close).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    view.unmount()
    expect(context.close).toHaveBeenCalledOnce()
  })

  it("avoids animation and audio analysis when reduced motion is enabled", async () => {
    const { stream } = recordingStream()
    const view = renderHook(({ reduced }) => useRecordingWaveform(stream, reduced), {
      initialProps: { reduced: false },
    })
    await advance()
    view.rerender({ reduced: true })
    expect(view.result.current).toBeNull()
    expect(context.close).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    const reduced = renderHook(() => useRecordingWaveform(stream, true))
    expect(createContext).toHaveBeenCalledOnce()
    reduced.unmount()
    view.unmount()
  })

  it("keeps visualizer failure optional without acquiring another microphone", async () => {
    const { stream } = recordingStream()
    context.state = "suspended"
    context.resume.mockRejectedValue(new Error("AudioContext blocked"))
    const view = renderHook(() => useRecordingWaveform(stream, false))
    await advance()
    expect(view.result.current).toBeNull()
    expect(context.close).toHaveBeenCalledOnce()
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    view.unmount()
  })

  it("does not start sampling if recording ends while the audio context is resuming", async () => {
    const { stream } = recordingStream()
    context.state = "suspended"
    let resume: (() => void) | undefined
    context.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve
        })
    )
    const view = renderHook(({ current }) => useRecordingWaveform(current, false), {
      initialProps: { current: stream as MediaStream | null },
    })
    view.rerender({ current: null })
    await act(async () => resume?.())
    expect(view.result.current).toBeNull()
    expect(context.close).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("handles unsupported browsers and missing streams without starting analysis", () => {
    vi.stubGlobal("AudioContext", undefined)
    const { stream } = recordingStream()
    const unsupported = renderHook(() => useRecordingWaveform(stream, false))
    const missing = renderHook(() => useRecordingWaveform(null, false))
    expect(unsupported.result.current).toBeNull()
    expect(missing.result.current).toBeNull()
    expect(createContext).not.toHaveBeenCalled()
    unsupported.unmount()
    missing.unmount()
  })
})
