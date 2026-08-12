import { Metadata } from "next"
import Link from "next/link"
import { COMPETITOR_PRICING } from "@/lib/pricing-comparison"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs LeetCode: Which Is Better for Interview Prep?",
  description:
    "Compare CodeSparring and LeetCode for interview prep. See what each is built for, and when a mock interview matters more than another solved problem.",
  alternates: {
    canonical: "/codesparring-vs-leetcode",
  },
}

export default function VsLeetCodePage() {
  const contentSections = [
    {
      heading: "What LeetCode does well",
      content: (
        <>
          <p>
            LeetCode has the largest problem bank around, and it is still the standard place to
            learn data structures and algorithms in the first place. If a pattern like two pointers
            or dynamic programming has not clicked yet, drilling LeetCode until it does is time well
            spent.
          </p>
          <p>
            What it cannot do is put someone across the table from you. LeetCode tests whether your
            code passes. Interviews test whether you can carry a round while someone watches, asks
            questions, and reacts to what you say.
          </p>
        </>
      ),
    },
    {
      heading: "What CodeSparring adds",
      content: (
        <>
          <p>
            CodeSparring's AI interviewer reacts as you work. It asks about the choices you make,
            follows the edits to your code, and takes the conversation by voice or text. You leave
            with a scored rubric covering communication, problem solving, and code quality, not just
            whether the tests pass.
          </p>
          <p>
            The DSA bank covers 170+ scenarios across 18 interview patterns: arrays and hashing, two
            pointers, sliding window, stack, binary search, linked list, trees, tries, heaps,
            backtracking, graphs, advanced graphs, 1-D DP, 2-D DP, greedy, intervals, math and
            geometry, and bit manipulation. Each one plays out as a conversation, not a submission
            box.
          </p>
          <p>
            Some interviews do not start from a blank file, either. You get handed a real codebase
            with a failing test and asked to find and fix the bug. CodeSparring runs these as{" "}
            <Link href="/rounds">debugging rounds</Link>: a verified pack runs your fix against the
            same test suite a reviewer would use, so passing means the bug is actually gone.
          </p>
        </>
      ),
    },
    {
      heading: "When to use which",
      content: (
        <>
          <p>
            Build your fundamentals wherever you like. LeetCode's bank works for that, and so do
            CodeSparring's free <Link href="/learn/python">Python</Link>,{" "}
            <Link href="/learn/data-engineering">Data Engineering</Link>, and{" "}
            <Link href="/learn/system-design">System Design</Link> courses, which start at the
            fundamentals and run in your browser.
          </p>
          <p>
            You also do not have to wait until the patterns feel familiar: more than 40 of the DSA
            scenarios are rated easy and the first one is a guided warm-up, so rehearsing the round
            itself, thinking out loud, taking questions on your approach, and writing code while
            someone watches, can start on day one. The free plan includes 8 full sessions a month
            with complete feedback, no card required.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Does CodeSparring have LeetCode-style questions?",
      answer:
        "Yes. The DSA bank spans 170+ scenarios across 18 patterns, from arrays and hashing to graphs and dynamic programming. The difference is that each one is a conversation with an interviewer, not a submission box.",
    },
    {
      question: "Do I need an account to try it?",
      answer:
        "You can open the workspace and run a problem without one. The AI interviewer needs a free account, which takes one click with Google or GitHub.",
    },
    {
      question: "How does the price compare to LeetCode Premium?",
      answer: `LeetCode Premium runs $${COMPETITOR_PRICING.leetcodePremium.monthlyPrice} a month. CodeSparring's free plan costs nothing and includes 8 full interview sessions a month. Pro is $25 a month, or $225 billed yearly, for 35 sessions, spaced repetition, and a personalized roadmap.`,
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs LeetCode"
      subtitle="Comparison"
      heroDescription="LeetCode is where most people learn the patterns. CodeSparring is where you practice the rounds LeetCode skips: thinking out loud, taking follow-up questions, and debugging code that is not yours."
      primaryKeyword="interview simulator"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
