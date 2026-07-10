/**
 * CaseLabScopePanel (PF-10) — honest scope for a lab.
 *
 * Names the rounds this lab actually rehearses and, critically, the real rounds
 * it does NOT, each with an in-app link to prep it. Prevents a candidate from
 * finishing ~2 of ~5 Palantir rounds believing they are interview-ready.
 * Rendered on the intro (set expectations) and the completed Review (point to
 * what's next).
 */

import Link from "next/link"
import { ArrowUpRight, Check } from "lucide-react"
import type { CaseLabCoverage } from "@/lib/labs/types"

export function CaseLabScopePanel({
  coverage,
  className,
}: {
  coverage: CaseLabCoverage
  className?: string
}) {
  return (
    <section
      aria-labelledby="scope-title"
      className={`border-border flex flex-col gap-3 rounded-lg border p-3 ${className ?? ""}`}
    >
      <h2
        id="scope-title"
        className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
      >
        What this prepares — and what to prep elsewhere
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-foreground text-xs font-medium">This lab rehearses</h3>
          <ul className="flex flex-col gap-1.5">
            {coverage.covers.map((item) => (
              <li key={item} className="text-muted-foreground flex items-start gap-2 text-xs">
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--wb-success,theme(colors.green.600))]"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-foreground text-xs font-medium">Prep these elsewhere</h3>
          <ul className="flex flex-col gap-1.5">
            {coverage.prepElsewhere.map((link) => (
              <li key={link.round}>
                <Link
                  href={link.href}
                  className="group text-muted-foreground hover:text-foreground flex items-start justify-between gap-2 text-xs transition-colors"
                >
                  <span>{link.round}</span>
                  <span className="text-primary flex shrink-0 items-center gap-0.5 font-medium">
                    {link.cta}
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
