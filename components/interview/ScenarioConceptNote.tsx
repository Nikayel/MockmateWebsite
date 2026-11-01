"use client"

import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SCENARIO_CONCEPTS, type ScenarioConceptId } from "@/lib/scenarios/concept-notes"

export function ScenarioConceptNote({ conceptId }: { conceptId: ScenarioConceptId }) {
  const concept = SCENARIO_CONCEPTS[conceptId]
  return (
    <aside
      aria-label={`${concept.title} introduction`}
      className="border-border bg-muted/30 rounded-lg border p-3"
    >
      <p className="text-muted-foreground text-xs font-medium">Before you start</p>
      <p className="text-foreground mt-1 text-sm leading-relaxed">{concept.summary}</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" className="text-accent-strong mt-1 min-h-11 px-0 text-sm">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {concept.title}: quick explanation
          </Button>
        </DialogTrigger>
        <DialogContent className="interview-workspace max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl motion-reduce:animate-none [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:flex [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center">
          <DialogHeader>
            <DialogTitle className="pr-10 leading-snug">{concept.title}</DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">
              {concept.summary}
            </DialogDescription>
          </DialogHeader>
          <div className="text-foreground space-y-4 text-sm leading-relaxed">
            <p>{concept.intuition}</p>
            <p>{concept.example}</p>
            <div className="border-border border-t pt-4">
              <h3 className="mb-1 font-semibold">Systems intuition</h3>
              <p>{concept.systemsIntuition}</p>
            </div>
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="mt-1 min-h-11">
              Back to task
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
