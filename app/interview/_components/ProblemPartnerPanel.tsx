"use client"

import { useRef, type ComponentProps } from "react"
import { FileText, MessageCircleCode, PanelLeftClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ProblemColumn, type ProblemColumnCtx } from "./ProblemColumn"
import { SparraPartnerWidget } from "./SparraPartnerWidget"

type PartnerProps = ComponentProps<typeof SparraPartnerWidget>

interface ProblemPartnerPanelProps {
  problemCtx: ProblemColumnCtx
  partner: PartnerProps
  onPartnerExpandedChange: (expanded: boolean) => void
  hasPartner: boolean
  onToggleCollapse?: () => void
  onOpenPartner: () => void
}

export function ProblemPartnerPanel({
  problemCtx,
  partner,
  onPartnerExpandedChange,
  hasPartner,
  onToggleCollapse,
  onOpenPartner,
}: ProblemPartnerPanelProps) {
  const problemTabRef = useRef<HTMLButtonElement>(null)
  const showPartner = hasPartner && partner.expanded && !problemCtx.focusMode

  const returnToProblem = () => {
    onPartnerExpandedChange(false)
    requestAnimationFrame(() => problemTabRef.current?.focus())
  }

  return (
    <Tabs
      value={showPartner ? "sparra" : "problem"}
      activationMode="manual"
      onValueChange={(value) =>
        value === "sparra" ? onOpenPartner() : onPartnerExpandedChange(false)
      }
      className="workspace-panel flex h-full min-h-0 flex-col overflow-hidden border"
    >
      <div className="border-border flex shrink-0 items-center justify-between border-b px-2">
        <TabsList
          aria-label="Problem and partner"
          className="workspace-tabs h-auto justify-start gap-1 rounded-none bg-transparent p-0"
        >
          <TabsTrigger ref={problemTabRef} value="problem" className="gap-2 px-2 text-xs">
            <FileText className="h-4 w-4" aria-hidden="true" /> Problem
          </TabsTrigger>
          {hasPartner && (
            <TabsTrigger
              value="sparra"
              className="gap-2 px-2 text-xs"
              aria-label="Sparra coding partner"
              data-bugfix-tour={partner.isDebuggingScenario ? "ai-partner" : undefined}
            >
              <MessageCircleCode className="h-4 w-4" aria-hidden="true" /> Sparra
            </TabsTrigger>
          )}
        </TabsList>
        {onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-muted-foreground hidden h-11 w-11 shrink-0 lg:inline-flex"
            aria-label="Collapse problem panel"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <TabsContent
        value="problem"
        forceMount
        className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
      >
        <ProblemColumn ctx={problemCtx} />
      </TabsContent>
      {hasPartner && (
        <TabsContent
          value="sparra"
          className="m-0 min-h-0 flex-1 overflow-hidden"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || event.defaultPrevented) return
            event.preventDefault()
            event.stopPropagation()
            returnToProblem()
          }}
        >
          <SparraPartnerWidget {...partner} expanded={showPartner} />
        </TabsContent>
      )}
    </Tabs>
  )
}
