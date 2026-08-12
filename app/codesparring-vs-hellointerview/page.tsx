import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs Hello Interview | AI Mock Interview Comparison",
  description:
    "Compare CodeSparring and Hello Interview for technical interview prep, from data structures and debugging rounds to system design.",
  alternates: {
    canonical: "/codesparring-vs-hellointerview",
  },
}

export default function VsHelloInterviewPage() {
  const contentSections = [
    {
      heading: "What Hello Interview does well",
      content: (
        <p>
          Hello Interview is built around system design: structured prep content plus AI-run mock
          interviews for a round that is genuinely hard to rehearse without another person in the
          loop. If system design is your gap, that focus is worth something.
        </p>
      ),
    },
    {
      heading: "Where CodeSparring covers more ground",
      content: (
        <>
          <p>
            CodeSparring also runs system design drills and a free{" "}
            <Link href="/learn/system-design">System Design</Link> course you can work through
            before you practice. Beyond design, it covers the rest of the loop too.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Data structures and algorithms:</strong> 170+ scenarios across 18 interview
              patterns, each one a conversation instead of a submission box.
            </li>
            <li>
              <strong>Debugging rounds:</strong> a real codebase with a failing test. You diagnose
              the bug and fix it, and a verified pack runs your fix against the same suite a
              reviewer would use. <Link href="/rounds">See a round</Link>.
            </li>
            <li>
              <strong>Case labs:</strong> Palantir-style forward-deployed scenarios like a 911
              dispatch system, an ontology build, a usage rollup, and a Stripe billing webhook.{" "}
              <Link href="/labs">Browse the labs</Link>.
            </li>
          </ul>
          <p>
            Every round, whatever the format, is scored on communication, problem solving, and code
            quality, with a rubric, session history, and per-pattern progress you can look back on.
          </p>
        </>
      ),
    },
    {
      heading: "When to use which",
      content: (
        <p>
          If system design is the one round you need to shore up, Hello Interview's focused content
          is a reasonable place to spend your time. If you want one place that covers DSA,
          debugging, case labs, and system design, with your progress tracked across all of them,
          that is the shape CodeSparring is built for.
        </p>
      ),
    },
  ]

  const faqs = [
    {
      question: "Does CodeSparring cover system design like Hello Interview?",
      answer:
        "Yes. System design drills exist alongside the DSA and debugging tracks, and the free System Design course in Learn covers the fundamentals before you practice.",
    },
    {
      question: "What does CodeSparring have beyond algorithm questions?",
      answer:
        "Debugging rounds drop you into a real codebase with a failing test to diagnose and fix. Case labs go further: forward-deployed style scenarios like a 911 dispatch system, an ontology build, a usage rollup, and a Stripe billing webhook.",
    },
    {
      question: "Is there a free plan?",
      answer:
        "Yes. The free plan includes 8 full interview sessions a month with complete AI feedback, no card required.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs Hello Interview"
      subtitle="Comparison"
      heroDescription="Hello Interview focuses on system design prep and AI mock interviews. CodeSparring covers that plus data structures and algorithms, debugging rounds, and case labs, all scored on the same rubric."
      primaryKeyword="AI mock interviewer"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
