import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { TrackedCtaLink } from "@/components/seo/TrackedCtaLink"
import { Terminal, CheckCircle2, ArrowRight } from "lucide-react"

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

export function LandingPageTemplate({
  title,
  subtitle,
  heroDescription,
  contentSections,
  faqs,
  primaryKeyword,
}: LandingPageTemplateProps) {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/5 pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(196, 112, 63,0.1)_0%,rgba(0,0,0,0)_70%)]" />
        <div className="relative z-10 container mx-auto max-w-4xl px-4 text-center">
          <span className="mb-6 inline-block rounded-full bg-[#c4703f]/10 px-4 py-1.5 text-sm font-semibold text-[#c4703f]">
            {subtitle}
          </span>
          <h1 className="font-heading mb-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 md:text-xl">
            {heroDescription}
          </p>
          <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
            <TrackedCtaLink
              href="/interview"
              location="seo_landing_hero"
              keyword={primaryKeyword}
            >
              <Button
                size="lg"
                className="h-14 bg-[#c4703f] px-8 text-lg font-bold text-black hover:bg-[#c4703f]/90"
              >
                Start practicing free
                <Terminal className="ml-2 h-5 w-5" />
              </Button>
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto max-w-3xl px-4">
          <article className="prose prose-invert prose-lg prose-headings:font-heading prose-a:text-[#c4703f] hover:prose-a:text-[#c4703f]/80 max-w-none">
            {contentSections.map((section, index) => (
              <div key={index} className="mb-12">
                <h2 className="mb-6 text-3xl font-bold text-white">{section.heading}</h2>
                <div className="space-y-4 leading-relaxed text-gray-300">{section.content}</div>
              </div>
            ))}
          </article>
        </div>
      </section>

      {/* Feature Highlight CTA */}
      <section className="border-y border-white/5 bg-zinc-900/50 py-16 md:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">
            Ready to master the {primaryKeyword}?
          </h2>
          <p className="mb-8 text-xl text-gray-400">
            Join thousands of engineers who used CodeSparring to land offers at top tech companies.
          </p>
          <div className="mb-10 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <CheckCircle2 className="mb-4 h-8 w-8 text-[#c4703f]" />
              <h3 className="mb-2 text-lg font-bold text-white">Voice & Text Practice</h3>
              <p className="text-sm text-gray-400">
                Practice communicating your thoughts out loud, just like a real interview.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <CheckCircle2 className="mb-4 h-8 w-8 text-[#c4703f]" />
              <h3 className="mb-2 text-lg font-bold text-white">Instant AI Feedback</h3>
              <p className="text-sm text-gray-400">
                Get scored on problem-solving, communication, and coding efficiency.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <CheckCircle2 className="mb-4 h-8 w-8 text-[#c4703f]" />
              <h3 className="mb-2 text-lg font-bold text-white">15+ DSA Patterns</h3>
              <p className="text-sm text-gray-400">
                Comprehensive coverage of all patterns tested by FAANG companies.
              </p>
            </div>
          </div>
          <TrackedCtaLink href="/interview" location="seo_landing_footer" keyword={primaryKeyword}>
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-white/20 px-8 text-lg font-bold text-white hover:bg-white hover:text-black"
            >
              Start practicing free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </TrackedCtaLink>
        </div>
      </section>

      {/* FAQ Section */}
      {faqs && faqs.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="mb-10 text-center text-3xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6">
                  <h3 className="mb-3 text-xl font-bold text-white">{faq.question}</h3>
                  <p className="leading-relaxed text-gray-400">{faq.answer}</p>
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
