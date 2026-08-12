import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "New Grad Coding Interview Practice",
  description:
    "Practice what new grad and intern loops actually run: a timed DSA phone screen, a debugging round, and SQL, with an AI interviewer and real feedback.",
  alternates: {
    canonical: "/new-grad-coding-interview-practice",
  },
}

export default function NewGradInterviewPracticePage() {
  const contentSections = [
    {
      heading: "What a new grad loop actually tests",
      content: (
        <p>
          An online assessment or a phone screen gets you in the door. What happens after depends on
          how you perform live: whether you can clarify the problem, think out loud, and write code
          someone else can follow while they watch and ask questions. New grad loops lean heavily on
          data structures and algorithms because most companies are not expecting deep systems
          experience yet. They are watching how you think.
        </p>
      ),
    },
    {
      heading: "Practicing the parts LeetCode does not test",
      content: (
        <>
          <p>
            Many new grads grind problems in silence and assume they are ready. In a real interview,
            if you do not talk, you fail. CodeSparring&apos;s AI interviewer expects both the code
            and the explanation, across 170+ scenarios in 18 interview patterns.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Ask clarifying questions before writing anything.</li>
            <li>State a first approach, even a slow one, before you optimize it.</li>
            <li>Talk through the time and space complexity of what you wrote.</li>
            <li>Take a hint without going quiet when you get stuck.</li>
          </ul>
          <p className="mt-4">
            DSA is not the whole loop, either. Many intern and new grad screens now include a
            debugging round: an unfamiliar codebase with a failing test you have to diagnose.
            CodeSparring runs that format too, one of the two rounds on the{" "}
            <Link href="/rounds">rounds page</Link>, with a verified pack that checks your fix
            against the real test suite. If SQL comes up in your screens, the free{" "}
            <Link href="/learn/data-engineering">SQL course</Link> runs real queries against a
            database in your browser.
          </p>
        </>
      ),
    },
    {
      heading: "Practice before it counts",
      content: (
        <p>
          The free plan includes 8 full interview sessions a month with complete AI feedback, no
          card required. Open the workspace and run a problem without an account first. A scored
          rubric after each session covers communication, problem solving, and code quality, not
          just whether your tests pass, so you know what to fix before the next one.
        </p>
      ),
    },
  ]

  const faqs = [
    {
      question: "What language should I use for a new grad interview?",
      answer:
        "Use whichever language you are most comfortable with. In real loops, Python, Java, and C++ are common for DSA rounds, and JavaScript or TypeScript are widely accepted too. On CodeSparring, JavaScript, TypeScript, and Python run in your browser with real, executable tests.",
    },
    {
      question: "Do new grads get asked system design questions?",
      answer:
        "Sometimes, and it is usually a simplified version, like a single API or a basic data model, rather than a large distributed system. It comes up more often for competitive roles. The free system design course covers the fundamentals one building block at a time if you want to prepare before a live discussion.",
    },
    {
      question: "How much should I practice?",
      answer:
        "Depth beats volume. Working through the 18 core patterns with real feedback on your communication does more than solving hundreds of unrelated problems in silence.",
    },
  ]

  return (
    <LandingPageTemplate
      title="New grad coding interview practice"
      subtitle="New grad prep"
      heroDescription="Practice what intern and new-grad loops actually run: DSA with a live AI interviewer, a debugging round in a real codebase, and SQL for data engineering screens. Free to start, no credit card."
      primaryKeyword="new grad coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
