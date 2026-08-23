/**
 * Why voice is not working, and what to tell the candidate about it.
 *
 * `DeepgramVoiceService.isConfigured()` is `!!apiKey || !!getAuthToken`, and
 * `getAuthToken` is a FUNCTION that the interview page always passes (a test
 * enforces it). So isConfigured is true even for a guest whose token resolves
 * to null, and gating the microphone on it would gate on nothing. Every real
 * failure happens later, when startTranscription actually tries to get a
 * credential and a microphone.
 *
 * That is why this classifies errors rather than checking config. The reasons
 * below are distinguished only where the candidate would DO something
 * different: grant a permission, sign in, plug a mic back in, or give up and
 * type. Two failures that lead to the same action are one reason.
 */

export type VoiceUnavailableReason =
  /** No auth token, so the token grant was never attempted. Guests land here. */
  | "not-signed-in"
  /** Our own endpoint declined to issue a credential (503, spend guard, outage). */
  | "service-unavailable"
  /** A credential was refused or could not be obtained for another reason. */
  | "credentials"
  /** The candidate denied the microphone permission, or the browser blocked it. */
  | "mic-denied"
  /** No input device, or a browser with no getUserMedia at all. */
  | "mic-missing"
  /** The mic was working and went away: unplugged, or permission revoked mid-session. */
  | "mic-disconnected"
  /** We had a credential and a mic, and the stream to Deepgram failed. */
  | "connection"
  | "unknown"

export interface VoiceUnavailableCopy {
  /** Short label for the control itself. */
  title: string
  /** One sentence the candidate can act on. */
  detail: string
  /** Whether trying the same thing again could plausibly work. */
  canRetry: boolean
}

/**
 * Map a thrown value to a reason.
 *
 * Matches on DOMException `name` first, because that is the part of the
 * getUserMedia contract browsers actually agree on; messages differ per engine
 * and per locale. Our own thrown Errors are matched on message because we own
 * those strings, and they are asserted in the tests so a reworded throw fails
 * loudly rather than silently degrading to "unknown".
 */
export function classifyVoiceError(error: unknown): VoiceUnavailableReason {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : ""

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "mic-denied"
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "mic-missing"
    case "NotReadableError":
    case "TrackStartError":
      return "mic-disconnected"
  }

  const message = error instanceof Error ? error.message : String(error ?? "")

  if (message.includes("Auth token required")) return "not-signed-in"
  if (message.includes("temporarily unavailable")) return "service-unavailable"
  if (message.includes("Failed to fetch voice token")) return "credentials"
  if (message.includes("credentials not available")) return "credentials"
  if (message.includes("Microphone disconnected")) return "mic-disconnected"
  if (message.includes("WebSocket") || message.includes("connection")) return "connection"

  return "unknown"
}

/**
 * What to show for a reason.
 *
 * Every `detail` names the thing the candidate can do next, and every one of
 * them ends at the same place: the interview still works by typing. Voice is a
 * convenience here, never the only way in, and copy that implies otherwise
 * would make a recoverable moment feel like a dead end.
 */
export function voiceUnavailableCopy(reason: VoiceUnavailableReason): VoiceUnavailableCopy {
  switch (reason) {
    case "not-signed-in":
      return {
        title: "Sign in to use voice",
        detail: "Voice transcription needs an account. You can keep typing your answers.",
        canRetry: false,
      }
    case "service-unavailable":
      return {
        title: "Voice is temporarily down",
        detail: "Transcription is unavailable right now. You can keep typing your answers.",
        canRetry: true,
      }
    case "credentials":
      return {
        title: "Voice could not start",
        detail: "We could not get a transcription session. Try again, or keep typing.",
        canRetry: true,
      }
    case "mic-denied":
      return {
        title: "Microphone blocked",
        detail:
          "Allow microphone access in your browser's site settings, then try again. You can keep typing meanwhile.",
        canRetry: true,
      }
    case "mic-missing":
      return {
        title: "No microphone found",
        detail: "Connect a microphone and try again. You can keep typing your answers.",
        canRetry: true,
      }
    case "mic-disconnected":
      return {
        title: "Microphone disconnected",
        detail: "Your microphone stopped responding. Reconnect it and try again.",
        canRetry: true,
      }
    case "connection":
      return {
        title: "Voice connection lost",
        detail: "The transcription stream dropped. Try again, or keep typing.",
        canRetry: true,
      }
    case "unknown":
      return {
        title: "Voice could not start",
        detail: "Something went wrong starting voice. Try again, or keep typing.",
        canRetry: true,
      }
  }
}
