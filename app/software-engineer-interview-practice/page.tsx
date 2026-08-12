import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Software Engineer Interview Practice",
  description:
    "Practice the software engineering loop: a timed DSA phone screen, a debugging round, and system design, with an AI interviewer.",
  alternates: {
    canonical: "/software-engineer-interview-practice",
  },
}

export default function SWEInterviewPracticePage() {
  const contentSections = [
    {
      heading: "The full loop, not just one round",
      content: (
        <p>
          A software engineering offer rarely comes down to one interview. Most loops run four to
          six rounds: a phone screen, one or two deeper technical rounds, sometimes system design,
          and a practical or debugging round. Each one is scored differently, and preparing for only
          the algorithmic part leaves the rest untested.
        </p>
      ),
    },
    {
      heading: "Rounds you can practice here",
      content: (
        <>
          <p>
            An AI interviewer runs each of these, by voice or text, and follows what you do instead
            of waiting for a final answer.
          </p>
          <div className="my-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Phone screen", "A timed DSA round across 170+ scenarios in 18 patterns."],
              ["Debugging", "A broken codebase and a failing test you diagnose and fix."],
              ["System design", "An open-ended architecture discussion, trade-offs included."],
            ].map(([label, text]) => (
              <div key={label} className="border-border bg-muted/40 rounded-lg border p-4">
                <p className="text-foreground text-sm font-semibold">{label}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">{text}</p>
              </div>
            ))}
          </div>
          <p>
            See both the debugging and case lab formats on the{" "}
            <Link href="/rounds">rounds page</Link>.
          </p>
        </>
      ),
    },
    {
      heading: "Where most candidates lose points",
      content: (
        <p>
          Most engineers do not fail interviews because they cannot code. They fail because they
          stay quiet while thinking, start typing before they understand the problem, or cannot
          explain the complexity of what they just wrote. A scored rubric after each session covers
          communication, problem solving, and code quality, not just whether the tests pass, so you
          know which of those to fix before the next one.
        </p>
      ),
    },
  ]

  const faqs = [
    {
      question: "Is this useful for frontend, backend, or full-stack roles?",
      answer:
        "Yes. The DSA patterns, debugging rounds, and system design drills are general to software engineering rather than tied to one specialization. If you want to build language fundamentals first, the free Python course runs in your browser.",
    },
    {
      question: "How long is a session?",
      answer:
        "Long enough to work through a full problem: read it, ask clarifying questions, write and run code, and get a scored rubric at the end.",
    },
    {
      question: "Can I see my progress across sessions?",
      answer:
        "Yes. Session history and per-pattern progress are part of every account, so you can see which rounds and patterns need more reps before a real loop.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Software engineer interview practice"
      subtitle="Interview loop"
      heroDescription="Practice the rounds in a real software engineering loop: a timed DSA phone screen, a debugging round in a broken codebase, and a system design discussion, all with an AI interviewer that reacts as you work."
      primaryKeyword="software engineer interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
