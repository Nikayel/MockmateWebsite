import type { Page } from "@playwright/test"

declare global {
  interface Window {
    voiceAudioFixture: {
      requests: number
      analyserContexts: number
      streams: MediaStream[]
      setAmplitude: (value: number) => void
    }
  }
}

/** Real Web Audio and MediaRecorder; only microphone hardware and Deepgram are substituted. */
export async function installVoiceAudio(
  page: Page,
  options: { visualizationUnavailable?: boolean; micDenied?: boolean } = {}
) {
  await page.addInitScript((options) => {
    const NativeAudioContext = window.AudioContext
    let gain: GainNode | null = null
    window.voiceAudioFixture = {
      requests: 0,
      analyserContexts: 0,
      streams: [],
      setAmplitude: (value) => {
        if (gain) gain.gain.value = value
      },
    }
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        window.voiceAudioFixture.analyserContexts += 1
      }
    }
    if (options.visualizationUnavailable)
      Object.defineProperty(window, "AudioContext", { value: undefined })

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          window.voiceAudioFixture.requests += 1
          if (options.micDenied) throw new DOMException("Permission denied", "NotAllowedError")
          const context = new NativeAudioContext()
          const oscillator = context.createOscillator()
          gain = context.createGain()
          gain.gain.value = 0
          const destination = context.createMediaStreamDestination()
          oscillator.connect(gain)
          gain.connect(destination)
          oscillator.start()
          await context.resume()
          const stream = destination.stream
          window.voiceAudioFixture.streams.push(stream)
          for (const track of stream.getTracks()) {
            const stop = track.stop.bind(track)
            track.stop = () => {
              if (track.readyState === "ended") return
              stop()
              oscillator.stop()
              void context.close()
            }
          }
          return stream
        },
      },
    })
  }, options)

  await page.routeWebSocket("wss://api.deepgram.com/v1/listen?**", (socket) => {
    let transcribed = false
    socket.onMessage((message) => {
      if (typeof message === "string") {
        if (message.includes("CloseStream")) socket.close()
      } else if (!transcribed) {
        transcribed = true
        socket.send(
          JSON.stringify({
            type: "Results",
            channel: { alternatives: [{ transcript: "I reproduced the failing case." }] },
            is_final: true,
          })
        )
      }
    })
  })
}

export async function openVoiceWorkspace(page: Page, theme = "light") {
  await page.goto(`/?view=workspace&voice=1&theme=${theme}`)
  if (page.viewportSize()!.width < 1024)
    await page.getByRole("button", { name: "Show interview chat", exact: true }).click()
  await page.getByRole("button", { name: "Start voice answer" }).click()
  await page.getByRole("button", { name: "Stop recording" }).waitFor()
}
