import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LandingPageBreadcrumb } from "@/components/seo/LandingPageBreadcrumb"
import { TrackedCtaLink } from "@/components/seo/TrackedCtaLink"

interface FAQ {
  question: string
  answer: string
}

interface LandingPageTemplateProps {
  title: string
  subtitle: string
  heroDescription: string
  contentSections: {
    heading: string
    content: React.ReactNode
  }[]
  faqs: FAQ[]
  primaryKeyword: string
}

/**
 * Shared shell for the acquisition pages (landing, comparison, and guide
 * routes). Everything here rides the platform theme tokens so a visitor who
 * lands from search sees the same surface they get after clicking through:
 * background/foreground/muted for color, border for hairlines, accent-strong
 * for link text, and the same primary button recipe as the homepage hero.
 * No hardcoded palettes: the old template was a fixed black page with its own
 * orange, which read as a different site than the product it was selling.
 */
const PRIMARY_CTA_CLASSES =
  "bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-[8px] px-8 py-3.5 text-base font-semibold transition-colors duration-200"

export function LandingPageTemplate({
  title,
  subtitle,
  heroDescription,
  contentSections,
  faqs,
  primaryKeyword,
}: LandingPageTemplateProps) {
  return (
    <main className="bg-background text-foreground font-ui min-h-screen">
      {/* One mount here covers all fourteen landing, comparison and guide pages that render through
          this template, none of which previously published a breadcrumb. */}
      <LandingPageBreadcrumb title={title} />
      <Header />

      {/* Hero */}
      <section className="border-border border-b pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <span className="border-border bg-background/40 text-muted-foreground mb-7 inline-flex rounded-full border px-4 py-1.5 text-[12px] font-medium tracking-[0.02em]">
            {subtitle}
          </span>
          <h1 className="text-foreground mb-5 text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.08] font-semibold tracking-[-0.03em]">
            {title}
          </h1>
          <p className="text-muted-foreground mx-auto mb-9 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
            {heroDescription}
          </p>
          <div className="flex flex-col items-center">
            <TrackedCtaLink
              href="/interview"
              location="seo_landing_hero"
              keyword={primaryKeyword}
              className={PRIMARY_CTA_CLASSES}
            >
              Start practicing free
            </TrackedCtaLink>
            <span className="text-muted-foreground mt-2.5 text-[12px]">
              No credit card required.
            </span>
          </div>
        </div>
      </section>

      {/* Page content */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <article className="[&_a]:text-accent-strong [&_a]:decoration-accent-strong/30 [&_a:hover]:decoration-accent-strong [&_strong]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-medium">
            {contentSections.map((section, index) => (
              <div key={index} className="mb-12 last:mb-0">
                <h2 className="text-foreground mb-4 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                  {section.heading}
                </h2>
                <div className="text-muted-foreground space-y-4 leading-7">{section.content}</div>
              </div>
            ))}
          </article>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-border bg-muted/40 border-y py-14 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-foreground mb-4 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            See where you actually stand.
          </h2>
          <p className="text-muted-foreground mx-auto mb-10 max-w-xl leading-7">
            One interviewer, a real editor, and a score you can act on.
          </p>
          <div className="mx-auto mb-10 grid max-w-2xl gap-8 text-left sm:grid-cols-3">
            <div>
              <p className="text-foreground text-sm font-semibold">Voice or text</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Talk through your approach out loud, or type it.
              </p>
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">Scored like a real loop</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Communication, problem solving, and code quality, not just passing tests.
              </p>
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">Free to start</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                8 full sessions a month on the free plan. No card.
              </p>
            </div>
          </div>
          <TrackedCtaLink
            href="/interview"
            location="seo_landing_footer"
            keyword={primaryKeyword}
            className={PRIMARY_CTA_CLASSES}
          >
            Start practicing free
          </TrackedCtaLink>
        </div>
      </section>

      {/* FAQ */}
      {faqs && faqs.length > 0 && (
        <section className="py-14 md:py-20">
          <div className="container mx-auto max-w-2xl px-4">
            <h2 className="text-foreground mb-6 text-2xl font-semibold tracking-[-0.02em]">
              Frequently asked questions
            </h2>
            <div className="divide-border divide-y">
              {faqs.map((faq, index) => (
                <div key={index} className="py-5">
                  <h3 className="text-foreground text-base font-semibold">{faq.question}</h3>
                  <p className="text-muted-foreground mt-2 leading-7">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  )
}
