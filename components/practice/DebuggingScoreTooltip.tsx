import type { ReactElement } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BUGFIX_SCORE_CATEGORIES,
  BUGFIX_SCORE_DIMENSIONS,
  type BugfixScoreCategory,
} from "@/lib/bugfix/score-dimensions"

export function DebuggingScoreTooltip({
  category,
  children,
}: {
  category: BugfixScoreCategory
  children: ReactElement
}) {
  const criteria = BUGFIX_SCORE_CATEGORIES[category]
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-[min(22rem,calc(100vw-2rem))] text-left text-wrap"
      >
        <p className="mb-2 font-semibold">How {criteria.label} is scored</p>
        <ul className="space-y-2">
          {criteria.dimensions.map((dimension) => {
            const definition = BUGFIX_SCORE_DIMENSIONS[dimension]
            return (
              <li key={dimension}>
                <p className="font-medium">
                  {definition.label} · {Math.round(definition.weight * 100)}% overall
                </p>
                <p className="mt-0.5 leading-relaxed opacity-80">{definition.description}</p>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 border-t border-current/20 pt-2 leading-relaxed opacity-80">
          This card averages its subcategories. Your overall score uses the individual weights
          above.
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
