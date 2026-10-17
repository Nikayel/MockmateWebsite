"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

export function SessionPauseNotice(props: {
  timedPractice?: boolean
  blockedByOtherTab?: boolean
  paused: boolean
  warning: boolean
  onResume: () => void
  onExit: () => void
}) {
  return (
    <>
      {props.warning && !props.paused && (
        <div
          role="status"
          className="bg-card fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm"
        >
          <span>Your session will pause in one minute.</span>
          <Button size="sm" variant="outline" onClick={props.onResume}>
            Continue
          </Button>
        </div>
      )}
      <Dialog open={props.paused}>
        <DialogContent
          className="w-[calc(100%-2rem)] [&>button:last-child]:hidden"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogTitle>Session paused</DialogTitle>
          <DialogDescription>
            {props.blockedByOtherTab
              ? "This attempt is active in another tab. Resume here to move it to this tab."
              : "Your work and conversations are preserved. Resume when you’re ready. Resuming continues this attempt."}
            {props.timedPractice && " The timed practice deadline still applies."}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={props.onExit}>
              {props.blockedByOtherTab ? "Back to dashboard" : "Save and exit"}
            </Button>
            <Button onClick={props.onResume}>Resume session</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
