"use client"

import { visibleLabsTracks } from "@/components/labs/labs-tracks"
import { LabsTrackCards } from "@/components/labs/LabsTrackCards"
import { useSprintLabsEnabled } from "@/components/sprint-labs/useSprintLabsEnabled"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** The picker window the header's "Labs" button opens. */
export function LabsTrackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sprintLabsEnabled = useSprintLabsEnabled()
  // Fail closed: the Sprint row appears only once the flag is confirmed on. Until then (and whenever
  // it is off) the panel shows exactly the Decomposition catalog that has always been live at /labs.
  const tracks = visibleLabsTracks(sprintLabsEnabled)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(44rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Choose your next round</DialogTitle>
          <DialogDescription>
            {tracks.length > 1
              ? "Take on a case today, or join a codebase that changes across ten sprints."
              : "Take on one real-world case and build until the tests pass."}
          </DialogDescription>
        </DialogHeader>
        <LabsTrackCards onSelect={() => onOpenChange(false)} tracks={tracks} className="mt-1" />
      </DialogContent>
    </Dialog>
  )
}
