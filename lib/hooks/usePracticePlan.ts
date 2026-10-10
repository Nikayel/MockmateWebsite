"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { trackEvent } from "@/lib/analytics"
import { useAuthedFetch } from "./useAuthedFetch"
import { practiceSaveError, UNCONFIRMED_SAVE } from "@/lib/practice-plan/client-response"
import { requestWithDeadline, RequestTimeoutError } from "@/lib/practice-plan/request-deadline"
import {
  practicePlanResponseSchema,
  type PracticePlanResponse,
  type SavePracticeRequest,
} from "@/lib/practice-plan/schema"

type Result =
  | PracticePlanResponse
  | { status: "loading" }
  | { status: "error" }
  | { status: "signed_out" }
  | { status: "reauth_required" }
export function usePracticePlan() {
  const { firebaseUser } = useAuth()
  const { get, send } = useAuthedFetch()
  const key = firebaseUser?.uid ?? ""
  const identity = useRef(key)
  identity.current = key
  const active = useRef<AbortController | null>(null)
  const version = useRef(0)
  const [loaded, setLoaded] = useState<{ key: string; result: Result } | null>(null)
  const [operation, setOperation] = useState<{
    key: string
    writing: boolean
    error: string | null
  } | null>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!firebaseUser) return
    const controller = new AbortController()
    const readVersion = version.current
    void requestWithDeadline(
      () => get<unknown>("/api/practice-plan", { signal: controller.signal }),
      controller
    )
      .then((response) => {
        if (
          controller.signal.aborted ||
          identity.current !== key ||
          version.current !== readVersion
        )
          return
        const parsed = practicePlanResponseSchema.safeParse(response.data)
        setLoaded({
          key,
          result: response.needsReauth
            ? { status: "reauth_required" }
            : response.ok && parsed.success
              ? parsed.data
              : { status: "error" },
        })
      })
      .catch(() => {
        if (
          (!controller.signal.aborted || controller.signal.reason instanceof RequestTimeoutError) &&
          identity.current === key &&
          version.current === readVersion
        )
          setLoaded({ key, result: { status: "error" } })
      })
    return () => {
      controller.abort()
      active.current?.abort()
      active.current = null
    }
  }, [firebaseUser, get, key, reload])

  const write = useCallback(
    async (method: "POST" | "DELETE", body: SavePracticeRequest | { revision: string }) => {
      if (active.current || !key) return false
      const controller = new AbortController()
      active.current = controller
      version.current++
      setOperation({ key, writing: true, error: null })
      try {
        const response = await requestWithDeadline(
          () => send<unknown>("/api/practice-plan", method, body, { signal: controller.signal }),
          controller
        )
        if (identity.current !== key) return false
        if (controller.signal.aborted) throw new Error("Save timed out")
        const parsed = practicePlanResponseSchema.safeParse(response.data)
        if (!response.ok || !parsed.success) {
          const message = practiceSaveError(response.data, response.needsReauth, response.error)
          setOperation({ key, writing: false, error: message })
          trackEvent("practice_plan_save_failed", { status_code: response.status })
          return false
        }
        setLoaded({ key, result: parsed.data })
        setOperation({ key, writing: false, error: null })
        trackEvent(
          method === "DELETE" ? "practice_plan_removed" : "practice_plan_saved",
          method === "POST" && "sourceSessionId" in body
            ? {
                source_session_id: body.sourceSessionId,
                scenario_id: body.scenarioId,
                reminder_requested: Boolean(body.reminderAt),
              }
            : {}
        )
        return true
      } catch {
        if (identity.current === key)
          setOperation({
            key,
            writing: false,
            error: UNCONFIRMED_SAVE,
          })
        return false
      } finally {
        if (active.current === controller) {
          active.current = null
          setOperation((state) => (state?.key === key ? { ...state, writing: false } : state))
        }
      }
    },
    [key, send]
  )
  return {
    result: !key
      ? ({ status: "signed_out" } as const)
      : loaded?.key === key
        ? loaded.result
        : ({ status: "loading" } as const),
    writing: operation?.key === key && operation.writing,
    error: operation?.key === key ? operation.error : null,
    save: (body: SavePracticeRequest) => write("POST", body),
    remove: (revision: string) => write("DELETE", { revision }),
    retry: () => {
      setLoaded(null)
      setReload((value) => value + 1)
    },
  }
}
