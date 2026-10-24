"use client"

import { useRef } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buildSessionDetailSections, sessionDetailHeadline } from "@/lib/admin/session-detail-view"
import type { SessionInspection } from "@/lib/admin/session-review/types"
import { useSessionInspection } from "./useSessionInspection"
import { Conversation } from "./Conversation"
import { SavedWork } from "./SavedWork"

/** Shared by the session catalog and a user's recent sessions. Heavy fields load on open. */
export function SessionDetailDialog({
  sessionId,
  token = null,
  onClose,
}: {
  sessionId: string | null
  token?: string | null
  onClose: () => void
}) {
  const { state, retry } = useSessionInspection(sessionId, token)
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <Dialog open={sessionId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[85vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto border-gray-800 bg-[#1a1917] text-white"
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault()
            returnFocus.current.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="pr-6 text-white">
            {state.status === "ready" ? state.inspection.session.scenarioTitle : "Session"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs break-all text-gray-400">
            {sessionId}
          </DialogDescription>
        </DialogHeader>
        {state.status === "loading" && (
          <div role="status" className="flex items-center justify-center gap-2 py-12 text-gray-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#c4703f]" />
            Loading session…
          </div>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="space-y-3 rounded-md border border-red-900/50 bg-red-950/20 p-4"
          >
            <p className="flex items-center gap-2 font-medium text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Could not load this session
            </p>
            <p className="text-sm text-red-200">{state.message}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
        {state.status === "ready" && <SessionContents inspection={state.inspection} />}
      </DialogContent>
    </Dialog>
  )
}

function SessionContents({ inspection }: { inspection: SessionInspection }) {
  const { session, conversations, work } = inspection
  const headline = sessionDetailHeadline(session)
  return (
    <div className="min-w-0 space-y-6">
      {headline && (
        <p className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-sm text-gray-300">
          {headline}
        </p>
      )}
      <Tabs defaultValue="conversation" className="min-w-0">
        <TabsList aria-label="Session inspection" className="grid w-full grid-cols-3 bg-gray-900">
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="work">Saved work</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="conversation">
          <Conversation conversations={conversations} />
        </TabsContent>
        <TabsContent value="work">
          <SavedWork work={work} />
        </TabsContent>
        <TabsContent value="details" className="space-y-5">
          {buildSessionDetailSections(session).map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-[#c4703f] uppercase">
                {section.title}
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div
                    key={field.label}
                    className="flex min-w-0 justify-between gap-4 border-b border-gray-800/60 py-1.5"
                  >
                    <dt className="text-sm text-gray-400">{field.label}</dt>
                    <dd
                      className={`min-w-0 text-right text-sm [overflow-wrap:anywhere] break-words ${field.tone === "absent" ? "text-gray-500" : field.tone === "accent" ? "font-medium text-[#e0a077]" : "text-gray-200"}`}
                    >
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
