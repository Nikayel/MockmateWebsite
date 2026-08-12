"use client"

/**
 * Admin Sessions
 *
 * This page used to render four stat cards and two charts, all read from
 * /api/admin/analytics. That endpoint recomputes the whole Overview, an unbounded
 * scan of every user, session and event, so looking at the sessions page paid for
 * a full-platform aggregation to draw four numbers. And having paid for it, an
 * admin still could not look at a single interview: there was no list, no filters
 * and no drill-in.
 *
 * It now reads /api/admin/sessions, which returns one bounded page. The counts in
 * the summary strip come from that same filtered query, so they describe what is
 * on screen instead of the platform at large.
 */

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, PageHeader, type Column } from "@/components/admin/shared"
import {
  Terminal,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  X,
} from "lucide-react"
import { logger } from "@/lib/logger"
import {
  SESSION_STATUS_DISPLAY,
  SESSION_STATUS_OPTIONS,
  SESSION_TYPE_OPTIONS,
  sessionTypeLabel,
  relativeTime,
  absoluteTime,
  formatDuration,
  formatScore,
} from "@/lib/admin/session-display"
import { buildSessionDetailSections, sessionDetailHeadline } from "@/lib/admin/session-detail-view"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SessionListRow, SessionDetail } from "@/lib/admin/session-rows"
import type { SessionListStatus } from "@/lib/admin/session-query"

const PAGE_SIZE = 25

/**
 * "BD" -> the regional-indicator flag emoji. Guest rows carry only coarse geo
 * (country/region/city, never an IP); anything that is not two letters
 * renders as no flag rather than garbage codepoints.
 */
function countryFlag(country: string): string {
  if (!/^[A-Za-z]{2}$/.test(country)) return ""
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

interface SessionFilters {
  status: SessionListStatus
  type: string
  userId: string
  from: string
  to: string
}

const EMPTY_FILTERS: SessionFilters = {
  status: "all",
  type: "",
  userId: "",
  from: "",
  to: "",
}

interface SessionsResponse {
  sessions: SessionListRow[]
  pagination: {
    pageSize: number
    returned: number
    nextCursor: string | null
    hasMore: boolean
    total: number | null
  }
  scan: { documentsRead: number; capped: boolean; ceiling: number }
}

const selectClass =
  "h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white focus:border-[#c4703f] focus:outline-none focus:ring-1 focus:ring-[#c4703f]"

export default function SessionsPage() {
  const { firebaseUser } = useAuth()

  const [filters, setFilters] = useState<SessionFilters>(EMPTY_FILTERS)
  const [direction, setDirection] = useState<"asc" | "desc">("desc")
  /**
   * Cursors used to reach the current page. Empty means the first page. This is a
   * stack rather than a page number because the endpoint paginates by cursor:
   * there is no offset to jump to, and inventing a page count would mean counting
   * every matching document on every request.
   */
  const [cursorStack, setCursorStack] = useState<string[]>([])

  const [result, setResult] = useState<SessionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  /**
   * Why the last load failed, or null. The list and this are rendered as
   * alternatives, never together: a 500 that fell through to the table would
   * render as "No sessions found", which is how a broken query looks exactly like
   * an empty platform.
   */
  const [error, setError] = useState<string | null>(null)

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const cursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : null

  const loadSessions = useCallback(async () => {
    if (!firebaseUser) return

    setLoading(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        direction,
      })
      if (filters.status !== "all") params.set("status", filters.status)
      if (filters.type) params.set("type", filters.type)
      if (filters.userId.trim()) params.set("userId", filters.userId.trim())
      if (filters.from) params.set("from", filters.from)
      if (filters.to) params.set("to", filters.to)
      if (cursor) params.set("cursor", cursor)

      const response = await fetch(`/api/admin/sessions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => null)

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || `Request failed with status ${response.status}`)
      }

      setResult(body as SessionsResponse)
    } catch (loadError) {
      logger.error("Error loading admin sessions", { error: loadError, filters, direction })
      setResult(null)
      setError(loadError instanceof Error ? loadError.message : "Could not load sessions")
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, filters, direction, cursor])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  /** Any filter change invalidates the cursor, which describes a position in the old result set. */
  const applyFilters = (next: Partial<SessionFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    setCursorStack([])
  }

  const handleSort = (columnKey: string, nextDirection: "asc" | "desc") => {
    if (columnKey !== "startedAt") return
    setDirection(nextDirection)
    setCursorStack([])
  }

  const goToNextPage = () => {
    const next = result?.pagination.nextCursor
    if (next) setCursorStack((stack) => [...stack, next])
  }

  const goToPreviousPage = () => {
    setCursorStack((stack) => stack.slice(0, -1))
  }

  const rows = result?.sessions ?? []
  const pagination = result?.pagination
  const filtersActive =
    filters.status !== "all" || !!filters.type || !!filters.userId || !!filters.from || !!filters.to

  const columns: Column<SessionListRow>[] = [
    {
      key: "startedAt",
      label: "Started",
      sortable: true,
      render: (_value, row) => (
        <span className="whitespace-nowrap text-gray-300" title={absoluteTime(row.startedAt)}>
          {relativeTime(row.startedAt)}
        </span>
      ),
    },
    {
      key: "scenarioTitle",
      label: "Problem",
      render: (_value, row) => (
        <div className="min-w-[12rem]">
          <div className="font-medium text-white">{row.scenarioTitle}</div>
          <div className="text-xs text-gray-500">
            {sessionTypeLabel(row.sessionType)} - {row.difficulty}
          </div>
        </div>
      ),
    },
    {
      key: "userLabel",
      label: "User",
      render: (_value, row) =>
        row.isGuest || !row.userId ? (
          <div>
            <span className="text-gray-400">{row.userLabel}</span>
            {/* Coarse trial origin (country/region/city; no IP is stored). */}
            {row.guestGeo && (
              <div className="text-xs text-gray-500">
                {countryFlag(row.guestGeo.country)}{" "}
                {[row.guestGeo.city, row.guestGeo.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => applyFilters({ userId: row.userId as string })}
            title="Show only this user's sessions"
            className="max-w-[14rem] truncate rounded-sm text-left text-gray-300 underline decoration-gray-700 underline-offset-4 hover:text-[#c4703f] focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none"
          >
            {row.userLabel}
          </button>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (_value, row) => (
        <Badge className={SESSION_STATUS_DISPLAY[row.status].className}>
          {SESSION_STATUS_DISPLAY[row.status].label}
        </Badge>
      ),
    },
    {
      key: "performanceScore",
      label: "Score",
      align: "right",
      render: (_value, row) => (
        <span className={row.performanceScore === null ? "text-gray-600" : "text-white"}>
          {formatScore(row.performanceScore)}
        </span>
      ),
    },
    {
      key: "durationMinutes",
      label: "Duration",
      align: "right",
      render: (_value, row) => (
        <span className="whitespace-nowrap text-gray-400">
          {formatDuration(row.durationMinutes)}
        </span>
      ),
    },
    {
      key: "sessionId",
      label: "",
      align: "right",
      render: (_value, row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedSessionId(row.sessionId)}
          className="border-gray-700 text-gray-400 hover:border-[#c4703f] hover:text-white"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Inspect
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        subtitle="Every interview round, filterable and inspectable"
        onRefresh={loadSessions}
        refreshing={loading}
      />

      {/* Filters */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="flex flex-col gap-1">
            <label htmlFor="session-status" className="text-xs text-gray-400">
              Status
            </label>
            <select
              id="session-status"
              value={filters.status}
              onChange={(event) =>
                applyFilters({ status: event.target.value as SessionListStatus })
              }
              className={selectClass}
            >
              {SESSION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="session-type" className="text-xs text-gray-400">
              Type
            </label>
            <select
              id="session-type"
              value={filters.type}
              onChange={(event) => applyFilters({ type: event.target.value })}
              className={selectClass}
            >
              {SESSION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="session-from" className="text-xs text-gray-400">
              Started after
            </label>
            <Input
              id="session-from"
              type="date"
              value={filters.from}
              onChange={(event) => applyFilters({ from: event.target.value })}
              className="h-9 w-40 border-gray-700 bg-gray-800 text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="session-to" className="text-xs text-gray-400">
              Started before
            </label>
            <Input
              id="session-to"
              type="date"
              value={filters.to}
              onChange={(event) => applyFilters({ to: event.target.value })}
              className="h-9 w-40 border-gray-700 bg-gray-800 text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="session-user" className="text-xs text-gray-400">
              User id
            </label>
            <Input
              id="session-user"
              value={filters.userId}
              placeholder="Exact user id"
              onChange={(event) => applyFilters({ userId: event.target.value })}
              className="h-9 w-56 border-gray-700 bg-gray-800 text-white"
            />
          </div>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(EMPTY_FILTERS)
                setCursorStack([])
              }}
              className="h-9 text-gray-400 hover:text-white"
            >
              <X className="mr-1.5 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary strip. These numbers come from the same filtered query as the
          rows below, so they describe the current view and not the platform. */}
      {!error && pagination && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#c4703f]" />
            Showing {pagination.returned}
            {pagination.total !== null && cursorStack.length === 0
              ? ` of ${pagination.total.toLocaleString()} matching`
              : " on this page"}
          </span>
          {pagination.total === null && filters.status !== "all" && (
            <span className="text-gray-500">
              No total for this status: it is defined by a missing field, which the index cannot
              count.
            </span>
          )}
          {result?.scan.capped && (
            <span className="text-yellow-500">
              Checked the {result.scan.ceiling} most recent matching sessions. Page forward for
              older ones.
            </span>
          )}
        </div>
      )}

      {/* Error state, rendered instead of the table so a failure can never read as
          an empty platform. */}
      {error ? (
        <Card className="border-red-900/50 bg-red-950/20">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="space-y-3">
              <div>
                <p className="font-medium text-red-300">Could not load sessions</p>
                <p className="mt-1 text-sm text-red-200/80">{error}</p>
                <p className="mt-2 text-sm text-gray-400">
                  This is a failed query, not an empty result. If a filter combination was just
                  added, its Firestore index may still need deploying.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSessions}
                className="border-red-800 text-red-300 hover:bg-red-950/40 hover:text-white"
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <DataTable
            title="Interview sessions"
            icon={Terminal}
            data={rows}
            columns={columns}
            keyExtractor={(row) => row.sessionId}
            loading={loading}
            onSort={handleSort}
            emptyMessage={
              filtersActive
                ? "No sessions match these filters."
                : "No interview sessions have been recorded yet."
            }
          />

          {/* Cursor pagination. Deliberately not page numbers: the endpoint has no
              offset to jump to, and a page count would mean counting every matching
              document on every request. */}
          {(cursorStack.length > 0 || pagination?.hasMore) && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {cursorStack.length === 0 ? "First page" : `Page ${cursorStack.length + 1}`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={cursorStack.length === 0 || loading}
                  className="border-gray-700 text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={!pagination?.hasMore || loading}
                  className="border-gray-700 text-gray-400 hover:text-white"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <SessionDetailDialog
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </div>
  )
}

/**
 * The drill-in: what the platform actually knows about one session.
 *
 * It fetches on open rather than shipping every field with every row, so the list
 * payload stays the columns the table renders and the heavy fields are read once,
 * for the one session an admin asked about.
 */
function SessionDetailDialog({
  sessionId,
  onClose,
}: {
  sessionId: string | null
  onClose: () => void
}) {
  const { firebaseUser } = useAuth()
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || !firebaseUser) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)

    const load = async () => {
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch(
          `/api/admin/sessions?sessionId=${encodeURIComponent(sessionId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.success) {
          throw new Error(body?.error || `Request failed with status ${response.status}`)
        }
        if (!cancelled) setDetail(body.session as SessionDetail)
      } catch (loadError) {
        logger.error("Error loading session detail", { error: loadError, sessionId })
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load this session")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // A slow response for a session the admin has already closed must not
    // overwrite the panel they opened next.
    return () => {
      cancelled = true
    }
  }, [sessionId, firebaseUser])

  const headline = detail ? sessionDetailHeadline(detail) : null

  return (
    <Dialog open={sessionId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-gray-800 bg-[#1a1917] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {detail ? detail.scenarioTitle : "Session"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-gray-500">
            {sessionId}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-[#c4703f]" />
          </div>
        )}

        {/* Distinct from an empty panel: a failed read says so. */}
        {error && !loading && (
          <div className="flex items-start gap-3 rounded-md border border-red-900/50 bg-red-950/20 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Could not load this session</p>
              <p className="mt-1 text-sm text-red-200/80">{error}</p>
            </div>
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-6">
            {headline && (
              <p className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-sm text-gray-300">
                {headline}
              </p>
            )}

            {buildSessionDetailSections(detail).map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-[#c4703f] uppercase">
                  {section.title}
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div
                      key={field.label}
                      className="flex justify-between gap-4 border-b border-gray-800/60 py-1.5"
                    >
                      <dt className="text-sm text-gray-500">{field.label}</dt>
                      <dd
                        className={
                          field.tone === "absent"
                            ? "text-sm text-gray-600"
                            : field.tone === "accent"
                              ? "text-sm font-medium text-[#e0a077]"
                              : "text-sm text-gray-200"
                        }
                      >
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
