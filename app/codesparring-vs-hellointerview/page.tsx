import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import { PRICING_CONFIG } from "@/lib/config"
import { COMPETITOR_PRICING, formatPlanPrice, formatVerifiedOn } from "@/lib/pricing-comparison"

/**
 * /codesparring-vs-hellointerview — SEO-27.
 *
 * A comparison page ranks on specificity and dies on a single wrong number about
 * the other company, so this page publishes ONLY facts it can point at:
 *
 *   - Our side comes from PRICING_CONFIG, the same config the checkout enforces.
 *   - Their side comes from `COMPETITOR_PRICING.helloInterview`, transcribed from
 *     their public pricing page with a `verifiedOn` date. Nothing about Hello
 *     Interview is typed into this file.
 *
 * The table carries a row only when BOTH cells are sourced. Everything we can say
 * about CodeSparring but cannot check about them lives in a clearly labelled
 * section below the table instead of in a column they never got to answer.
 */

const HELLO = COMPETITOR_PRICING.helloInterview
const REVIEWED_ON = formatVerifiedOn(HELLO.verifiedOn)
const { monthly, yearly } = PRICING_CONFIG.pro.website

export const metadata: Metadata = {
  title: "CodeSparring vs Hello Interview",
  description: `A sourced comparison of CodeSparring and Hello Interview: prices, how billing renews, what is free, and what each one covers. Reviewed ${REVIEWED_ON}.`,
  alternates: {
    canonical: "/codesparring-vs-hellointerview",
  },
}

interface ComparisonRow {
  feature: string
  ours: React.ReactNode
  theirs: React.ReactNode
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Paid price",
    ours: `${monthly.priceDisplay} a month, or ${yearly.totalDisplay} for a year`,
    theirs: Object.values(HELLO.plans)
      .map((plan) => `${plan.label} ${formatPlanPrice(plan)}`)
      .join(", "),
  },
  {
    feature: "How it renews",
    ours: "Monthly is a subscription you can cancel. Yearly is a single payment for 12 months and does not auto-renew.",
    theirs: "Access windows. Their checkout states plans do not auto-renew.",
  },
  {
    feature: "Free access",
    ours: `${PRICING_CONFIG.free.sessionsPerMonth} AI interview sessions a month plus every course lesson, no card.`,
    theirs: "Not described on their pricing page when we checked.",
  },
  {
    feature: "What the paid plan covers",
    ours: "Data structures and algorithms, debugging rounds, case labs, and system design.",
    theirs: HELLO.covers + ".",
  },
]

export default function VsHelloInterviewPage() {
  const contentSections = [
    {
      heading: `Side by side, reviewed ${REVIEWED_ON}`,
      content: (
        <>
          <div className="border-border my-6 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                CodeSparring compared with Hello Interview on price, renewal, free access, and
                coverage, reviewed {REVIEWED_ON}.
              </caption>
              <thead>
                <tr className="border-border bg-muted/40 border-b">
                  <th scope="col" className="text-foreground px-4 py-3 font-semibold">
                    &nbsp;
                  </th>
                  <th scope="col" className="text-foreground px-4 py-3 font-semibold">
                    CodeSparring
                  </th>
                  <th scope="col" className="text-foreground px-4 py-3 font-semibold">
                    {HELLO.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th
                      scope="row"
                      className="text-foreground px-4 py-3 align-top font-medium whitespace-nowrap"
                    >
                      {row.feature}
                    </th>
                    <td className="text-muted-foreground px-4 py-3 align-top leading-6">
                      {row.ours}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 align-top leading-6">
                      {row.theirs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Hello Interview figures were read from{" "}
            <a href={HELLO.source} rel="nofollow noopener">
              their public pricing page
            </a>{" "}
            on {REVIEWED_ON}. CodeSparring figures come from the same configuration our checkout
            charges against.
          </p>
          <p>
            The two products price differently in kind, not just in amount. Hello Interview sells
            access for a fixed window, including a lifetime option, so you pay once and the clock
            either runs out or never does. CodeSparring meters AI interview sessions per month,
            which is the part that costs us money to run, and leaves the courses unmetered.
          </p>
        </>
      ),
    },
    {
      heading: "What Hello Interview does well",
      content: (
        <p>
          Hello Interview built its reputation on system design, a round that is genuinely hard to
          rehearse without another person in the loop, and its coverage now runs wider than that.
          Their premium page lists {HELLO.covers}. A lifetime plan also suits a particular kind of
          candidate well: if you interview every couple of years rather than every couple of months,
          paying once beats carrying a subscription between job searches.
        </p>
      ),
    },
    {
      heading: "What CodeSparring adds that we could not check on their side",
      content: (
        <>
          <p>
            These are claims about our own product, backed by what the platform does. We are not
            asserting Hello Interview lacks them. Their pricing page did not describe these
            mechanics either way on {REVIEWED_ON}, so they stay out of the table above.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Rounds that are not algorithm questions.</strong> Debugging rounds drop you
              into a multi-file codebase with a failing test, and your fix is run against the same
              suite a reviewer would use. <Link href="/rounds">See a round</Link>.
            </li>
            <li>
              <strong>Case labs.</strong> Forward-deployed style scenarios: a 911 dispatch system,
              an ontology build, a usage rollup, and a Stripe billing webhook.{" "}
              <Link href="/labs">Browse the labs</Link>.
            </li>
            <li>
              <strong>One rubric across every format.</strong> DSA, debugging, and design rounds are
              all scored on communication, problem solving, and code quality, so progress in one
              round is comparable to progress in another.{" "}
              <Link href="/samples">Read a graded sample session</Link>.
            </li>
            <li>
              <strong>Courses that never spend a session.</strong> The{" "}
              <Link href="/learn/python">Python</Link>,{" "}
              <Link href="/learn/data-engineering">Data Engineering</Link>, and{" "}
              <Link href="/learn/system-design">System Design</Link> courses are free for everyone
              and run in the browser.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "When to use which",
      content: (
        <p>
          If system design is the one round you need to shore up, or you want to buy prep once and
          keep it, Hello Interview is a reasonable place to spend the money. If the loop you are
          facing spans algorithms, a debugging round, and a design conversation, and you want the
          same scoring across all three, that is the shape CodeSparring is built for. Our{" "}
          <Link href="/system-design-interview-practice">system design practice page</Link> shows
          exactly what a design round looks like here, so you can judge the design half yourself.
        </p>
      ),
    },
    {
      heading: "How we compared, and what we are not",
      content: (
        <>
          <p>
            <strong>Method.</strong> A row appears above only when both cells could be sourced: ours
            from the pricing configuration this site actually charges against, theirs from{" "}
            <a href={HELLO.source} rel="nofollow noopener">
              hellointerview.com/pricing
            </a>{" "}
            and its checkout page, read on {REVIEWED_ON}. Where a cell says a fact is not described,
            that means we could not verify it from their public pages, not that the feature is
            missing. Their prices were showing a promotion when we checked, so the table prints both
            the promotional and the list figure.
          </p>
          <p>
            <strong>Disclosure.</strong> CodeSparring has no affiliation with Hello Interview and no
            commercial relationship of any kind. There is no affiliate link on this page, and the
            links to their site are marked nofollow. We wrote this page and we sell one of the two
            products on it, so read it as a vendor comparison and check the prices yourself before
            you buy. Anything here that has gone out of date, tell us and we will fix the row and
            move the review date.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "How much does Hello Interview cost?",
      answer: `On ${REVIEWED_ON} their pricing page listed ${Object.values(HELLO.plans)
        .map((plan) => `${plan.label.toLowerCase()} at ${formatPlanPrice(plan)}`)
        .join(
          ", "
        )}. Those plans do not auto-renew, so each one buys a fixed window of access rather than a subscription. Check their page for the current figure.`,
    },
    {
      question: "Is CodeSparring cheaper than Hello Interview?",
      answer: `It depends on how long you prep. CodeSparring is ${monthly.priceDisplay} a month or ${yearly.totalDisplay} for a year, and the free plan gives you ${PRICING_CONFIG.free.sessionsPerMonth} AI interview sessions a month plus every course lesson at no cost. A one-off Hello Interview month costs more than a CodeSparring month, and their lifetime plan costs less than two CodeSparring years. Pick on which rounds you need, not on the monthly number.`,
    },
    {
      question: "Does CodeSparring cover system design like Hello Interview?",
      answer:
        "Yes. System design drills sit alongside the DSA and debugging tracks, and the free System Design course in Learn covers the building blocks before you practice. Our system design practice page walks through what one of those rounds looks like end to end.",
    },
    {
      question: "What does CodeSparring have beyond algorithm questions?",
      answer:
        "Debugging rounds drop you into a real codebase with a failing test to diagnose and fix. Case labs go further: forward-deployed style scenarios like a 911 dispatch system, an ontology build, a usage rollup, and a Stripe billing webhook.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs Hello Interview"
      subtitle="Comparison"
      heroDescription={`A sourced, side by side look at what each product costs, how it bills, and which interview rounds it covers. Prices checked ${REVIEWED_ON}.`}
      primaryKeyword="AI mock interviewer"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
