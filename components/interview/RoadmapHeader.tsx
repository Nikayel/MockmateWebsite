/**
 * RoadmapHeader Component
 *
 * Header for DSA Roadmap showing:
 * - Title and legend
 * - Overall progress statistics
 * - Mini-legend for node states
 */

import { GitBranch, Lock } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface RoadmapHeaderProps {
  totalCompleted: number
  totalProblems: number
}

export function RoadmapHeader({ totalCompleted, totalProblems }: RoadmapHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-emerald-500" />
          DSA Skill Tree
        </h2>
        {/* Inline mini-legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted"></div>
            Ready
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Done
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{totalCompleted}</span>/{totalProblems} solved
        </div>
        <Progress value={(totalCompleted / totalProblems) * 100} className="w-24 h-1.5 bg-muted" />
      </div>
    </div>
  )
}
