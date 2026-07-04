"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OverwhelmedBannerProps {
  totalDue: number
  maxDailyReviews: number
  deferCount: number
  onDeferClick: () => void
  isDeferring: boolean
}

export function OverwhelmedBanner({
  totalDue,
  maxDailyReviews,
  deferCount,
  onDeferClick,
  isDeferring,
}: OverwhelmedBannerProps) {
  if (totalDue <= maxDailyReviews) return null

  return (
    <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-300">Feeling overwhelmed?</p>
          <p className="mt-1 text-sm text-amber-400/80">
            You have {totalDue} reviews due (your limit is {maxDailyReviews}). Defer low-priority
            items to spread them across the next few days.
          </p>
          <p className="mt-2 text-xs text-amber-500/60">
            Deferred items are simply moved to later days. Your memory scores are not penalized.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onDeferClick}
          disabled={isDeferring}
          className="flex-shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
        >
          {isDeferring ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Deferring...
            </>
          ) : (
            <>Defer {deferCount} items</>
          )}
        </Button>
      </div>
    </div>
  )
}
