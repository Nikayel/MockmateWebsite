import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface ChoiceCardProps<T extends string | number> {
  value: T
  label: string
  description?: string
  selected: boolean
  onSelect: (value: T) => void
  icon?: LucideIcon
}

export function ChoiceCard<T extends string | number>({
  value,
  label,
  description,
  selected,
  onSelect,
  icon: Icon,
}: ChoiceCardProps<T>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "min-h-20 rounded-xl border p-4 text-left transition-colors",
        "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
        selected
          ? "border-accent/60 bg-accent/10 text-foreground"
          : "border-border/70 bg-background/45 text-muted-foreground hover:border-accent/35 hover:bg-muted/50"
      )}
    >
      <span className="flex items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
              selected ? "bg-accent/15 text-accent-strong" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
        <span>
          <span className="text-foreground block text-sm font-medium">{label}</span>
          {description && (
            <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
              {description}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
