import Link from "next/link"
import { ChevronRight, Clock, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RecentActivityHeader() {
  return (
    <div
      className="border-border/50 flex items-center justify-between gap-3 border-b p-3 sm:p-4"
      data-tour="welcome"
    >
      <Link
        href="/sessions"
        aria-label="View all practice sessions"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-0 items-center gap-2 rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">Recent Activity</span>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
      </Link>
      <Button
        asChild
        size="sm"
        className="bg-card text-foreground hover:bg-muted min-h-11 shrink-0 px-3 text-xs sm:text-sm"
      >
        <Link href="/interview" data-tour="start-practice-btn">
          <Terminal className="h-4 w-4" aria-hidden="true" />
          Start Practice
        </Link>
      </Button>
    </div>
  )
}
