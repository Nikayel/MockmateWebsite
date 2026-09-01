/**
 * Drop browser exceptions PostHog cannot attribute to our own code.
 *
 * Exception autocapture (turned on by `defaults: "2025-05-24"` in
 * instrumentation-client.ts) reports every uncaught error thrown on our pages.
 * That includes errors from browser extensions and third-party scripts injected
 * into the document, which land in our Error Tracking inbox looking exactly like
 * our own bugs. Their stack frames point at extension URLs or anonymous inline
 * code, so no source map can symbolicate them and no change we ship can fix
 * them.
 *
 * This filter keeps an exception only when at least one stack frame is
 * attributable: a frame with a real script filename that is neither a browser
 * extension URL nor an anonymous frame. An event with no attributable frame is
 * dropped before it leaves the browser. Non-exception events pass through
 * unchanged.
 */
import type { BeforeSendFn, CaptureResult } from "posthog-js"

// Filename prefixes that never belong to our code. A frame whose filename starts
// with one of these came from a browser extension, not our bundle.
const EXTENSION_FRAME_SCHEMES = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "webkit-masked-url://",
]

interface StackFrame {
  filename?: unknown
}

interface CapturedException {
  stacktrace?: { frames?: unknown }
}

function isAttributableFrame(frame: StackFrame): boolean {
  const filename = typeof frame.filename === "string" ? frame.filename : ""
  if (!filename || filename === "<anonymous>") return false
  return !EXTENSION_FRAME_SCHEMES.some((scheme) => filename.startsWith(scheme))
}

function hasAttributableFrame(exceptionList: unknown): boolean {
  if (!Array.isArray(exceptionList)) return false
  return exceptionList.some((exception: CapturedException) => {
    const frames = exception?.stacktrace?.frames
    return Array.isArray(frames) && frames.some(isAttributableFrame)
  })
}

export const dropUnattributableExceptions: BeforeSendFn = (
  event: CaptureResult | null,
): CaptureResult | null => {
  if (!event || event.event !== "$exception") return event
  if (hasAttributableFrame(event.properties?.$exception_list)) return event
  return null
}
