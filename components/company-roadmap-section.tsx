"use client"

import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

// Each company is selectable in the roadmap wizard; this is roadmap coverage,
// not a claim that every company has a live Case Lab.
const ROADMAP_COMPANIES = [
  { name: "Palantir", logo: "/company-logos/palantir.svg" },
  { name: "Stripe", logo: "/company-logos/stripe.svg" },
  { name: "Meta", logo: "/company-logos/meta.svg" },
  { name: "Amazon", logo: "/company-logos/amazon.svg" },
  { name: "Google", logo: "/company-logos/google.svg" },
  { name: "Microsoft", logo: "/company-logos/microsoft.svg" },
] as const

function CompanyLogoList({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul className="roadmap-logo-list" aria-hidden={duplicate || undefined}>
      {ROADMAP_COMPANIES.map(({ name, logo }) => (
        <li key={name} className="roadmap-logo-item">
          <Image src={logo} alt="" width={30} height={30} unoptimized aria-hidden="true" />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  )
}

/** A short homepage invitation; the company selection happens in the roadmap wizard. */
export function CompanyRoadmapSection() {
  return (
    <section
      aria-labelledby="company-roadmap-heading"
      className="bg-background px-4 py-20 sm:px-6 md:py-28"
    >
      <div className="company-roadmap-panel relative isolate mx-auto max-w-[1120px] overflow-hidden rounded-[28px] px-5 pt-14 pb-8 sm:px-10 md:pt-20 md:pb-10">
        <div className="relative z-10 mx-auto max-w-[720px] text-center">
          <p className="company-roadmap-chapter inline-flex rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.08em] uppercase">
            The plan
          </p>
          <h2
            id="company-roadmap-heading"
            className="company-roadmap-serif mx-auto mt-8 max-w-[680px] text-[clamp(2.25rem,5.2vw,4.1rem)] leading-[1.09] font-medium tracking-[-0.015em] text-balance"
          >
            A plan for the company on your calendar.
          </h2>
          <p className="company-roadmap-copy mx-auto mt-6 max-w-[50ch] text-base leading-7 md:text-lg md:leading-8">
            Choose the company and date. We&apos;ll turn its interview patterns into a week-by-week
            plan.
          </p>
          <Link
            href="/roadmap/new"
            onClick={() =>
              trackEvent("cta_click", {
                location: "roadmap_primary",
                destination: "/roadmap/new",
              })
            }
            className="company-roadmap-cta mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition-[background-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Set your target
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="company-roadmap-footer relative z-10 mt-16 border-t pt-6 md:mt-20">
          <p className="company-roadmap-footer-label mb-6 text-center text-[11px] font-medium tracking-[0.12em] uppercase">
            Plans for interviews at
          </p>
          <div className="roadmap-logo-viewport" aria-label="Roadmap companies">
            <div className="roadmap-logo-track">
              <CompanyLogoList />
              <CompanyLogoList duplicate />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CompanyRoadmapSection
