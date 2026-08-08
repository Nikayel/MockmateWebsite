"use client"

import { useId, useState } from "react"
import { Bug, Lightbulb, Loader2, MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import {
  FEEDBACK_CONTENT_MAX,
  FEEDBACK_CONTENT_MIN,
  type UserFeedbackType,
} from "@/lib/feedback/user-feedback-schema"

/**
 * The entry point for the `feedback` collection.
 *
 * POST /api/product-feedback existed, was auth-gated, rate limited and schema-validated, and
 * nothing in the product called it. An endpoint with no caller and an admin dashboard with no
 * writer are the same defect seen from two ends: the founder reads an empty triage queue as
 * "users have nothing to say" when the truth is that users were never asked.
 *
 * Three properties this component is responsible for:
 *
 * 1. What the user typed survives a failed submit. A network error that clears the box costs the
 *    user the whole message and they do not write it twice.
 * 2. Pending, success and failure are all visible, and announced, rather than inferred from a
 *    button that stopped doing anything.
 * 3. The length bound it enforces is the one the server enforces, imported from the same module,
 *    so the form cannot accept text the API was always going to reject.
 */

/**
 * Keyed by the API's own union, so a new submittable type cannot ship without a button here. The
 * placeholder is per type because "What happened instead?" is the question that turns a bug report
 * into a reproducible one.
 */
const TYPE_OPTIONS: Record<
  UserFeedbackType,
  { label: string; icon: typeof Bug; placeholder: string }
> = {
  feedback: {
    label: "General feedback",
    icon: MessageSquare,
    placeholder: "What is working well, and what is not?",
  },
  bug_report: {
    label: "Report a bug",
    icon: Bug,
    placeholder: "What did you do, what did you expect, and what happened instead?",
  },
  feature_request: {
    label: "Request a feature",
    icon: Lightbulb,
    placeholder: "What would you like to be able to do?",
  },
}

/** Display order. `USER_FEEDBACK_TYPES` is the API's order; the bug button belongs second. */
const TYPE_ORDER: readonly UserFeedbackType[] = ["feedback", "bug_report", "feature_request"]

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string }

export function SendFeedbackCard() {
  const [type, setType] = useState<UserFeedbackType>("feedback")
  const [content, setContent] = useState("")
  const [state, setState] = useState<SubmitState>({ status: "idle" })
  const textareaId = useId()

  const trimmedLength = content.trim().length
  const tooShort = trimmedLength < FEEDBACK_CONTENT_MIN
  const tooLong = trimmedLength > FEEDBACK_CONTENT_MAX
  const sending = state.status === "sending"
  const active = TYPE_OPTIONS[type]

  const submit = async () => {
    if (tooShort || tooLong || sending) return
    setState({ status: "sending" })

    try {
      const token = await getCurrentUserToken()
      if (!token) {
        setState({ status: "error", message: "Please sign in again, then send this." })
        return
      }

      const response = await fetch("/api/product-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          content: content.trim(),
          // Where they were when they wrote it. On a bug report this is often the whole diagnosis.
          path: typeof window === "undefined" ? undefined : window.location.pathname,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        // The server's message is the useful one (rate limited, too long, signed out). Anything
        // unrecognized falls back to something a person can act on.
        setState({
          status: "error",
          message:
            typeof data?.error === "string"
              ? data.error
              : "Could not send that. Your message is still here, so you can try again.",
        })
        return
      }

      // Only now is it safe to clear the box: the server has the text.
      setContent("")
      setState({ status: "sent" })
    } catch {
      setState({
        status: "error",
        message: "Could not reach the server. Your message is still here, so you can try again.",
      })
    }
  }

  return (
    <section className="border-border rounded-xl border p-5">
      <div className="flex items-start gap-3">
        <Send className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground text-base font-semibold">Send us feedback</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            This goes straight to the founder, not to a ticketing system. If something is broken,
            say which page you were on and we will look at it.
          </p>

          <fieldset className="mt-4">
            <legend className="text-muted-foreground mb-2 text-sm">What kind of message?</legend>
            <div className="flex flex-wrap gap-2">
              {TYPE_ORDER.map((value) => {
                const option = TYPE_OPTIONS[value]
                const Icon = option.icon
                const selected = value === type
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    disabled={sending}
                    onClick={() => setType(value)}
                    className="gap-2"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-4 space-y-2">
            <label htmlFor={textareaId} className="text-muted-foreground text-sm">
              Your message
            </label>
            <Textarea
              id={textareaId}
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                // A previous failure is stale the moment they start editing, but a previous
                // success is not cleared here: it is the receipt for the message they just sent.
                if (state.status === "error") setState({ status: "idle" })
              }}
              placeholder={active.placeholder}
              rows={5}
              disabled={sending}
              aria-describedby={`${textareaId}-hint`}
              aria-invalid={tooLong}
            />
            <p id={`${textareaId}-hint`} className="text-muted-foreground text-xs">
              {tooLong
                ? `That is ${trimmedLength - FEEDBACK_CONTENT_MAX} characters too long.`
                : `At least ${FEEDBACK_CONTENT_MIN} characters. ${trimmedLength} of ${FEEDBACK_CONTENT_MAX} used.`}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={submit}
              disabled={sending || tooShort || tooLong}
              size="sm"
              className="gap-2"
            >
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {sending ? "Sending" : "Send feedback"}
            </Button>

            <p
              role="status"
              aria-live="polite"
              className={`text-xs ${
                state.status === "error"
                  ? "text-red-500"
                  : state.status === "sent"
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
              }`}
            >
              {state.status === "sending"
                ? "Sending your message..."
                : state.status === "sent"
                  ? "Thank you. We have it, and we read every one."
                  : state.status === "error"
                    ? state.message
                    : tooShort && trimmedLength > 0
                      ? "A little more detail, please."
                      : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
