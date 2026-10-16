/** @vitest-environment jsdom */

import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatColumn } from "../ChatColumn"

vi.mock("../SableWaitStatus", () => ({
  SableWaitStatus: () => <p role="status">Sable is replying…</p>,
}))

const props = {
  focusMode: false,
  activePanel: "chat" as const,
  interviewerMessages: [{ type: "user" as const, message: "I reproduced the failure." }],
  isLoadingInterviewer: false,
  isGeneratingDiscussion: false,
  interviewerEndRef: createRef<HTMLDivElement>(),
  isInterviewStarted: true,
  showPostInterviewDiscussion: false,
  isRecordingInterviewer: false,
  onToggleRecording: vi.fn(),
  onCancelRecording: vi.fn(),
  onCancelCountdown: vi.fn(),
  onSendMessage: vi.fn(),
  countdownActive: false,
  interviewerInput: "",
  onInterviewerInputChange: vi.fn(),
}

describe("interviewer composer", () => {
  it("keeps reply progress in the conversation after a message is submitted", () => {
    const { rerender } = render(<ChatColumn {...props} isLoadingInterviewer />)
    expect(screen.getByRole("status").textContent).toContain("Sable is replying")
    expect(screen.queryByText(/sending/i)).toBeNull()
    const mic = screen.getByRole("button", { name: "Start voice answer" })
    expect(mic.hasAttribute("disabled")).toBe(true)
    rerender(<ChatColumn {...props} />)
    expect(mic.hasAttribute("disabled")).toBe(false)
  })

  it("uses one send action for a typed draft without a voice transcript preview", () => {
    render(<ChatColumn {...props} interviewerInput="My hypothesis" />)
    expect(screen.queryByText("Transcribed")).toBeNull()
    expect(screen.getAllByRole("button", { name: /send/i })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Send message", exact: true }))
    expect(props.onSendMessage).toHaveBeenCalledOnce()
  })

  it("cancels the scheduled voice send before sending the transcript manually", () => {
    const cancelCountdown = vi.fn()
    const send = vi.fn(() => expect(cancelCountdown).toHaveBeenCalledOnce())
    render(
      <ChatColumn
        {...props}
        isRecordingInterviewer
        countdownActive
        interviewerInput="I traced the loop boundary"
        onSendMessage={send}
        onCancelCountdown={cancelCountdown}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Send voice answer" }))
    expect(send).toHaveBeenCalledOnce()
    expect(screen.queryByRole("textbox", { name: "Chat with interviewer" })).toBeNull()
  })

  it("does not duplicate the wait indicator while a reply is streaming", () => {
    render(
      <ChatColumn
        {...props}
        isLoadingInterviewer
        interviewerMessages={[
          ...props.interviewerMessages,
          { type: "ai", message: "Which case", isStreaming: true },
        ]}
      />
    )
    expect(screen.getByText("Which case")).toBeTruthy()
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByText(/sending/i)).toBeNull()
  })

  it("shows reply progress while the first interviewer message is being prepared", () => {
    render(<ChatColumn {...props} interviewerMessages={[]} isGeneratingDiscussion />)
    expect(screen.getByRole("status").textContent).toContain("Sable is replying")
    expect(screen.queryByText(/start your interview/i)).toBeNull()
  })
})
