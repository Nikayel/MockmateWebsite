import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import { PRICING_CONFIG } from "@/lib/config"
import { COMPETITOR_PRICING } from "@/lib/pricing-comparison"

export const metadata: Metadata = {
  title: "AI Coding Interview Practice",
  description:
    "Practice coding interviews with an AI interviewer that reacts as you work: real editor, real tests, and a scored rubric across 18 interview patterns.",
  alternates: {
    canonical: "/ai-coding-interview-practice",
  },
}

export default function AICodingInterviewPracticePage() {
  const contentSections = [
    {
      heading: "What makes it feel like a real interview",
      content: (
        <>
          <p>
            Solving a problem alone tells you whether your code passes. It does not tell you whether
            you can carry a conversation while you write it. CodeSparring&apos;s AI interviewer
            follows what you do as you work: it asks why you chose an approach, what happens at the
            edges, and whether a faster solution exists. Talk it through out loud or type it.
          </p>
          <p>
            You can try a session without an account: open the workspace, write a solution, and run
            the tests, with no email and no card. The interviewer itself needs a free account, one
            click with Google or GitHub. The{" "}
            <Link href="/free-ai-coding-interview">free AI coding interview page</Link> sets out
            exactly where that line falls, how many sessions the free plan carries, and when the
            allowance resets.
          </p>
        </>
      ),
    },
    {
      heading: "170+ scenarios across 18 patterns",
      content: (
        <>
          <p>
            DSA interviews draw on a smaller set of patterns than any problem count suggests.
            CodeSparring&apos;s scenarios are organized around 18 of them:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Arrays and hashing, two pointers, and sliding window.</li>
            <li>Stacks, binary search, and linked lists.</li>
            <li>Trees, tries, heaps, and backtracking.</li>
            <li>Graphs, advanced graphs, and dynamic programming.</li>
            <li>Greedy, intervals, math and geometry, and bit manipulation.</li>
          </ul>
          <p className="mt-4">
            If a language, not the pattern, is what slows you down, the free{" "}
            <Link href="/learn/python">Python course</Link> covers the fundamentals these problems
            lean on, with graded exercises that run in the browser.
          </p>
        </>
      ),
    },
    {
      heading: "What you get back",
      content: (
        <>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              A scored rubric covering communication, problem solving, and code quality, not just
              whether the tests pass.
            </li>
            <li>
              Session history and per-pattern progress, so you can see where to practice next.
            </li>
            <li>
              On Pro, spaced repetition scheduling and a personalized roadmap that resurfaces the
              patterns you struggled with.
            </li>
          </ul>
          <p className="mt-4">
            DSA is one round. CodeSparring also runs{" "}
            <Link href="/rounds">bug-fix and case lab rounds</Link> set in real codebases, and
            system design drills, for practice past algorithms. Browse{" "}
            <Link href="/samples">graded sample sessions</Link> to see what feedback looks like.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "How does this compare to a human mock interview?",
      // Prices are read, never typed. The literals that used to sit in this
      // answer were the same numbers lib/pricing-comparison.ts exists to keep
      // in one place, and a price change would have left this FAQ quoting a
      // rate nothing else on the site charged.
      answer: `Human mock interviews typically run $${COMPETITOR_PRICING.humanMock.perSessionMin} to $${COMPETITOR_PRICING.humanMock.perSessionMax} a session, and a real engineer brings judgment an AI cannot fully replicate. CodeSparring is available any time, from free (${PRICING_CONFIG.free.sessionsPerMonth} sessions a month) to ${PRICING_CONFIG.pro.website.monthly.priceDisplay} a month for ${PRICING_CONFIG.pro.sessionsPerMonth}. Many candidates use both: AI sessions for repetition, a human session closer to the real interview.`,
    },
    {
      question: "Can I use voice to talk through my solution?",
      answer:
        "Yes. Voice or text, your choice. The interviewer follows what you say and what you edit in the code.",
    },
    {
      question: "Are the questions the same as LeetCode?",
      answer:
        "The underlying data structures and algorithms are the ones you would find anywhere. The difference is the format: the interviewer asks about your approach and follows up on the choices you make, instead of only checking whether your output matches an expected result.",
    },
  ]

  return (
    <LandingPageTemplate
      title="AI coding interview practice"
      subtitle="Practice"
      heroDescription="Pick a problem, talk through your approach, and write code against tests that run. The AI interviewer follows what you do and asks about your choices, across 170+ scenarios in 18 interview patterns."
      primaryKeyword="coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
