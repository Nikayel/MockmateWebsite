/**
 * The contract this locks down: exception autocapture keeps our own errors and
 * drops the ones we can never fix.
 *
 * PostHog exception autocapture reports every uncaught browser error, including
 * errors thrown by browser extensions and injected third-party scripts. Those
 * arrive with frames that point at extension URLs or anonymous inline code, so
 * no source map resolves them and no code we own explains them. The original
 * report was exactly this shape: one exception on a static lesson page whose
 * only frame carried no attributable filename. `dropUnattributableExceptions`
 * removes that class before it reaches the inbox, while any exception with a
 * real bundle frame — which source maps now symbolicate — passes through.
 */
import { describe, expect, it } from "vitest"
import type { CaptureResult } from "posthog-js"
import { dropUnattributableExceptions } from "@/lib/posthog-exception-filter"

function exceptionEvent(filenames: (string | undefined)[][]): CaptureResult {
  return {
    uuid: "test-uuid",
    event: "$exception",
    properties: {
      $exception_list: filenames.map((frameFilenames) => ({
        type: "Error",
        value: "boom",
        stacktrace: {
          type: "raw",
          frames: frameFilenames.map((filename) => ({ filename })),
        },
      })),
    },
  } as CaptureResult
}

describe("dropUnattributableExceptions", () => {
  it("passes non-exception events through unchanged", () => {
    const event = { uuid: "u", event: "$pageview", properties: {} } as CaptureResult
    expect(dropUnattributableExceptions(event)).toBe(event)
  })

  it("passes a null event through", () => {
    expect(dropUnattributableExceptions(null)).toBeNull()
  })

  it("keeps an exception with a frame from our bundle", () => {
    const event = exceptionEvent([
      ["https://codesparring.com/_next/static/chunks/app.js"],
    ])
    expect(dropUnattributableExceptions(event)).toBe(event)
  })

  it("drops an exception whose only frame is a browser extension", () => {
    const event = exceptionEvent([
      ["moz-extension://abc/inject.js", "chrome-extension://def/content.js"],
    ])
    expect(dropUnattributableExceptions(event)).toBeNull()
  })

  it("drops an exception whose only frame is anonymous", () => {
    const event = exceptionEvent([["<anonymous>"]])
    expect(dropUnattributableExceptions(event)).toBeNull()
  })

  it("drops an exception whose frame has no filename", () => {
    const event = exceptionEvent([[undefined]])
    expect(dropUnattributableExceptions(event)).toBeNull()
  })

  it("drops an exception with an empty stack", () => {
    const event = exceptionEvent([[]])
    expect(dropUnattributableExceptions(event)).toBeNull()
  })

  it("drops an exception with no exception list", () => {
    const event = {
      uuid: "u",
      event: "$exception",
      properties: {},
    } as CaptureResult
    expect(dropUnattributableExceptions(event)).toBeNull()
  })

  it("keeps the event when any exception in the list is attributable", () => {
    const event = exceptionEvent([
      ["safari-web-extension://xyz/inject.js"],
      ["https://codesparring.com/_next/static/chunks/lesson.js"],
    ])
    expect(dropUnattributableExceptions(event)).toBe(event)
  })

  it("keeps the event when one frame among extension frames is ours", () => {
    const event = exceptionEvent([
      [
        "webkit-masked-url://hidden/",
        "https://codesparring.com/_next/static/chunks/page.js",
      ],
    ])
    expect(dropUnattributableExceptions(event)).toBe(event)
  })
})
