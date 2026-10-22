import Link from "next/link"
import { Bug, ListTree } from "lucide-react"
import { cn } from "@/lib/utils"

export const GUIDED_LABS_PATH = "/interview?track=debugging&view=guided-labs"

export function DebuggingFormatNavigation({
  browsingLabs,
  roundCount,
  labCount,
}: {
  browsingLabs: boolean
  roundCount: number
  labCount: number
}) {
  const formats = [
    {
      label: "Practice rounds",
      href: "/interview?track=debugging",
      count: roundCount,
      Icon: Bug,
      active: !browsingLabs,
    },
    {
      label: "Guided labs",
      href: GUIDED_LABS_PATH,
      count: labCount,
      Icon: ListTree,
      active: browsingLabs,
    },
  ]
  return (
    <nav
      aria-label="Debugging practice format"
      className="border-border mt-4 flex flex-wrap gap-x-4 border-b sm:gap-x-6"
    >
      {formats.map(({ label, href, count, Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring -mb-px flex min-h-11 min-w-0 items-center gap-1.5 border-b-2 px-0.5 pb-2 text-xs font-medium transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none sm:gap-2 sm:text-sm",
            active
              ? "border-accent text-foreground"
              : "text-muted-foreground hover:text-foreground border-transparent"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
          <span className="text-muted-foreground hidden text-xs tabular-nums min-[360px]:inline">
            {count}
          </span>
          {href === GUIDED_LABS_PATH && (
            <span className="border-border text-muted-foreground rounded border px-1 text-[10px] leading-4">
              Beta
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
