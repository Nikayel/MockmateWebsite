import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "What is a Real-World Coding Interview? | CodeSparring Guide",
  description:
    "Learn what to expect in practical, real-world software engineering interview rounds and how to prepare for them.",
}

export default function RealWorldGuidePage() {
  const contentSections = [
    {
      heading: "The Shift Away from LeetCode",
      content: (
        <>
          <p>
            While Data Structures and Algorithms remain standard for junior roles, many progressive
            tech companies (like Stripe, Square, and Palantir) are pivoting to "Real-World" or
            "Practical" interview rounds.
          </p>
          <p>
            Instead of asking you to reverse a linked list, they evaluate how you perform in the
            actual day-to-day environment of a software engineer.
          </p>
        </>
      ),
    },
    {
      heading: "Types of Real-World Rounds",
      content: (
        <>
          <p>There are typically three formats for a real-world interview:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>The Bug Fix:</strong> You are given an existing codebase with failing tests.
              You must trace the error and deploy a fix.
            </li>
            <li>
              <strong>Add Functionality:</strong> You are given a working application and asked to
              implement a new feature (e.g., "Add pagination to this React list component").
            </li>
            <li>
              <strong>The Take-Home Assignment:</strong> A multi-hour project you complete on your
              own time, followed by a live code-review session where you must defend your
              architectural choices.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "How to Prepare",
      content: (
        <>
          <p>
            Preparing for real-world rounds requires familiarity with popular frameworks (React,
            Node.js, Express) and tools (Git, Chrome DevTools, debugging in an IDE).
          </p>
          <p>
            CodeSparring offers a suite of "Real-World" mock interviews where you are dropped into
            actual project codebases. Our AI acts as a Tech Lead, answering questions about the
            legacy code and reviewing your PRs in real-time.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Are these rounds harder than algorithmic rounds?",
      answer:
        "They are generally less mathematically rigorous but require stronger architectural intuition. If you have built side projects, you will likely find real-world rounds more natural than abstract puzzles.",
    },
  ]

  return (
    <LandingPageTemplate
      title="What is a Real-World Coding Interview?"
      subtitle="The Practical Tech Screen"
      heroDescription="Explore the rise of practical interview rounds. Learn how to debug legacy code, add features on the fly, and ace your real-world technical screen."
      primaryKeyword="real-world coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
