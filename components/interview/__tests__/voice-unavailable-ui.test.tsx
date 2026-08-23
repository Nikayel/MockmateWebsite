/**
 * @vitest-environment jsdom
 *
 * What the candidate sees when voice cannot start.
 *
 * Before this, nothing in the UI consulted voice availability at all. The mic
 * button rendered unconditionally and `startRecording` threw on click, so a
 * guest, or anyone whose token grant failed, got a control that looked live and
 * did nothing explicable. A dead button is worse than no button: it cannot be
 * told apart from a misclick or a broken site.
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { VoiceModeToggle } from "../VoiceModeToggle"
import { voiceUnavailableCopy } from "@/lib/voice/voice-availability"

vi.mock("framer-motion", () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get:
      () =>
      ({ children, ...props }: { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

const noop = () => {}

describe("VoiceModeToggle when voice is unavailable", () => {
  it("replaces the mic control rather than disabling it", () => {
    render(
      <VoiceModeToggle
        isRecording={false}
        onToggleRecording={noop}
        unavailable={voiceUnavailableCopy("mic-denied")}
      />
    )

    // No clickable mic at all: a disabled button still invites a click and
    // still explains nothing.
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("status")).toBeTruthy()
  })

  it("names the problem and the way out", () => {
    render(
      <VoiceModeToggle
        isRecording={false}
        onToggleRecording={noop}
        unavailable={voiceUnavailableCopy("mic-denied")}
      />
    )

    expect(screen.getByText("Microphone blocked")).toBeTruthy()
    expect(screen.getByText(/site settings/i)).toBeTruthy()
    expect(screen.getByText(/keep typing/i)).toBeTruthy()
  })

  it("tells a guest to sign in rather than blaming their microphone", () => {
    render(
      <VoiceModeToggle
        isRecording={false}
        onToggleRecording={noop}
        unavailable={voiceUnavailableCopy("not-signed-in")}
      />
    )

    expect(screen.getByText("Sign in to use voice")).toBeTruthy()
    expect(screen.getByText(/needs an account/i)).toBeTruthy()
  })

  it("renders the normal mic control when voice is fine", () => {
    render(<VoiceModeToggle isRecording={false} onToggleRecording={noop} unavailable={null} />)

    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it("defaults to available when the prop is omitted", () => {
    render(<VoiceModeToggle isRecording={false} onToggleRecording={noop} />)

    expect(screen.queryByRole("status")).toBeNull()
  })
})
