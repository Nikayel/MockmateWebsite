"use client"

import React, { useRef } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { BookOpen, Check, Mic, Repeat, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { getProPricing, PRICING_CONFIG } from "@/lib/config"
import {
  buildFeatureMatrix,
  type CourseLessonCounts,
  type PlanCell,
  type PlanFeatureGroup,
} from "@/lib/pricing-features"

/**
 * FeatureMatrix — the full Free-vs-Pro inventory on /pricing.
 *
 * The plan cards above stay scannable, so this table is where every shipped
 * feature gets a row: all three courses (with lesson counts derived from the
 * catalog at build time), Case Labs, both interview tracks, and the Pro
 * retention layer. The cards summarize; this section is the spec.
 *
 * Same accessibility contract as ComparisonSection's table: a real <table>
 * with scoped headers and an sr-only caption, boolean cells carry sr-only
 * "Included"/"Not included" text because the icon is otherwise the only
 * signal, and the whole thing scrolls horizontally on narrow screens instead
 * of crushing the label column.
 */

const GROUP_ICONS: Record<PlanFeatureGroup["id"], LucideIcon> = {
  courses: BookOpen,
  practice: Mic,
  retention: Repeat,
}

function MatrixCell({ value, pro }: { value: PlanCell; pro?: boolean }) {
  if (typeof value === "string") {
    return (
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap",
          pro ? "text-accent-strong" : "text-foreground"
        )}
      >
        {value}
      </span>
    )
  }
  if (value) {
    return (
      <>
        <Check
          aria-hidden
          className={cn("mx-auto h-4 w-4", pro ? "text-accent-strong" : "text-neural-strong")}
        />
        <span className="sr-only">Included</span>
      </>
    )
  }
  return (
    <>
      <X aria-hidden className="text-muted-foreground mx-auto h-4 w-4" />
      <span className="sr-only">Not included</span>
    </>
  )
}

export function FeatureMatrix({ courses }: { courses: CourseLessonCounts }) {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })
  const prefersReducedMotion = useReducedMotion()
  const groups = buildFeatureMatrix(courses)
  const yearly = getProPricing("website").yearly

  return (
    <section
      ref={sectionRef}
      aria-labelledby="feature-matrix-heading"
      className="bg-background py-16 lg:py-20"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="mb-10 text-center"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <p className="text-accent-strong text-xs font-semibold tracking-[0.12em] uppercase">
              The full inventory
            </p>
            <h2
              id="feature-matrix-heading"
              className="font-heading text-foreground mt-2 text-3xl font-semibold tracking-tight"
            >
              Everything on the platform
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-lg leading-relaxed">
              Every course is free for everyone. Pro adds volume and the system that makes practice
              stick.
            </p>
          </motion.div>

          <motion.div
            className="border-border bg-card rounded-[18px] border p-4 sm:p-6"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-left">
                <caption className="sr-only">
                  Every CodeSparring feature, and whether the Free or Pro plan includes it
                </caption>
                <thead>
                  <tr className="border-border border-b">
                    <th
                      scope="col"
                      className="text-muted-foreground pb-3 text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                      Feature
                    </th>
                    <th scope="col" className="w-[88px] pb-3 text-center align-bottom sm:w-[104px]">
                      <span className="text-foreground block text-xs font-semibold">Free</span>
                      <span className="text-muted-foreground text-[11px]">
                        {PRICING_CONFIG.free.priceDisplay}
                      </span>
                    </th>
                    <th scope="col" className="w-[88px] pb-3 text-center align-bottom sm:w-[104px]">
                      <span className="text-accent-strong block text-xs font-semibold">Pro</span>
                      <span className="text-accent-strong text-[11px]">
                        {`from ${yearly.priceDisplay}/mo`}
                      </span>
                    </th>
                  </tr>
                </thead>
                {groups.map((group) => {
                  const Icon = GROUP_ICONS[group.id]
                  return (
                    <tbody key={group.id}>
                      <tr>
                        <th
                          colSpan={3}
                          scope="rowgroup"
                          className="pt-6 pb-2 text-left font-normal"
                        >
                          <span className="flex items-center gap-2">
                            <span className="bg-accent-soft flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                              <Icon aria-hidden className="text-accent-strong h-3.5 w-3.5" />
                            </span>
                            <span className="text-foreground text-sm font-semibold">
                              {group.title}
                            </span>
                            <span className="text-muted-foreground hidden text-xs sm:inline">
                              {group.note}
                            </span>
                          </span>
                        </th>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.label} className="border-border border-b last:border-0">
                          <th
                            scope="row"
                            className="text-foreground py-2.5 pr-2 text-sm leading-snug font-normal"
                          >
                            {row.label}
                          </th>
                          <td className="py-2.5 text-center">
                            <MatrixCell value={row.free} />
                          </td>
                          <td className="py-2.5 text-center">
                            <MatrixCell value={row.pro} pro />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )
                })}
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
