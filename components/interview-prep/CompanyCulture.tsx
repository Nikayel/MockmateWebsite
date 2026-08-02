import type { CompanyQuestionData } from "@/lib/data/company-questions/types"

/**
 * The company's `coreValues` and `engineeringCulture`, which had been authored for all 38 companies
 * and rendered on precisely zero of them.
 *
 * Both blocks were written as retrieval context for the AI interviewer, so every line is already
 * about how a candidate is judged. That makes them the honest replacement for the invented
 * "1,847 engineers prepared this month" banner this page used to carry: real authored substance
 * instead of a hash of the company name dressed up as social proof.
 *
 * Server Component, ungated, in the static HTML. Nearly every company in the roster schedules at
 * least one behavioral round, so this is not filler: it is the half of the loop the pattern tables
 * say nothing about.
 *
 * `valueKeywords` is deliberately not rendered: it is a prompt-conditioning list, not prose, and it
 * reads as keyword stuffing on a public page.
 */
interface CompanyCultureProps {
  company: CompanyQuestionData
}

/** A titled list. Returns nothing for an empty list so a partial record cannot leave a bare heading. */
function CultureList({ title, items }: { title: string; items: string[] | undefined }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h3 className="text-foreground mb-2 text-sm font-medium">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-muted-foreground flex gap-2 text-sm">
            <span className="text-muted-foreground/70" aria-hidden="true">
              ·
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CompanyCulture({ company }: CompanyCultureProps) {
  const { coreValues, engineeringCulture } = company
  if (!coreValues && !engineeringCulture) return null

  const practices: { label: string; value: string }[] = engineeringCulture
    ? [
        { label: "Code review", value: engineeringCulture.codeReviewStyle },
        { label: "Deployment", value: engineeringCulture.deploymentPhilosophy },
        { label: "Documentation", value: engineeringCulture.documentationExpectations },
      ].filter((row) => row.value.length > 0)
    : []

  return (
    <section aria-labelledby="company-culture-heading" className="border-border border-t py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h2
            id="company-culture-heading"
            className="text-foreground mb-1 text-xl font-medium sm:text-2xl"
          >
            How {company.name} judges you outside the code
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            The values and engineering norms the interviewers are calibrated against. Useful for the
            behavioral round, and useful for deciding which trade-off to argue for in the technical
            one.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <CultureList title="Values they name" items={coreValues?.principles} />
              <CultureList
                title="What they look for in behavioral rounds"
                items={coreValues?.behavioralExpectations}
              />
            </div>

            <div className="space-y-6">
              <CultureList title="How the team builds" items={engineeringCulture?.philosophy} />

              {engineeringCulture && engineeringCulture.techStack.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-2 text-sm font-medium">Primary stack</h3>
                  <ul className="flex flex-wrap gap-2">
                    {engineeringCulture.techStack.map((tech) => (
                      <li
                        key={tech}
                        className="border-border bg-card text-muted-foreground rounded border px-2 py-0.5 text-xs"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {practices.length > 0 && (
                <dl className="space-y-2">
                  {practices.map((row) => (
                    <div key={row.label} className="flex flex-wrap gap-x-2 text-sm">
                      <dt className="text-foreground font-medium">{row.label}</dt>
                      <dd className="text-muted-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
