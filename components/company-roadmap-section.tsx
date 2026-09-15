"use client"

import { ScrollReveal } from "@/lib/motion"
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
      className="bg-background relative overflow-hidden py-20 md:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,112,63,0.055),transparent_65%)]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <ScrollReveal>
          <p className="text-accent-strong text-xs font-semibold tracking-[0.16em] uppercase">
            Company-tailored prep
          </p>
          <h2
            id="company-roadmap-heading"
            className="font-heading text-foreground mx-auto mt-5 max-w-3xl text-[clamp(2rem,4vw,3.25rem)] leading-[1.12] font-bold tracking-[-0.035em]"
          >
            Prep for the company you&apos;re interviewing with.
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed md:text-lg">
            Pick your target company. Get a week-by-week plan built around its interview patterns.
          </p>
          <Link
            href="/roadmap/new"
            onClick={() =>
              trackEvent("cta_click", {
                location: "roadmap_primary",
                destination: "/roadmap/new",
              })
            }
            className="bg-accent text-accent-foreground focus-visible:ring-accent mt-8 inline-flex min-h-12 items-center gap-2 rounded-[14px] px-7 text-base font-bold shadow-[0_0_36px_rgba(196,112,63,0.18)] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Choose your company
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </ScrollReveal>
      </div>

      <div className="relative mx-auto mt-14 max-w-5xl px-6 md:mt-16">
        <div className="border-border/70 mb-5 border-t pt-5 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
            Roadmaps for your target company
          </p>
        </div>
        <div className="roadmap-logo-viewport" aria-label="Roadmap companies">
          <div className="roadmap-logo-track">
            <CompanyLogoList />
            <CompanyLogoList duplicate />
          </div>
        </div>
      </div>
    </section>
  )
}

export default CompanyRoadmapSection
