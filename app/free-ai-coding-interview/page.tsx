import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Free AI Coding Interview Practice",
  description:
    "Run a free mock coding interview with an AI interviewer that reacts as you work. Real editor, real tests, a scored rubric at the end. No credit card.",
  alternates: {
    canonical: "/free-ai-coding-interview",
  },
}

export default function FreePracticePage() {
  const contentSections = [
    {
      heading: "Try a full round before you commit",
      content: (
        <>
          <p>
            A mock interview only teaches you something if it behaves like the real thing. Here you
            pick a problem, talk through your approach, and write code against tests that actually
            run. The interviewer follows what you do and asks about the choices you make.
          </p>
          <div className="my-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Reasoning", "Talk through assumptions before the code."],
              ["Execution", "Run tests and inspect the result."],
              ["Feedback", "Leave with the next best rep."],
            ].map(([label, text]) => (
              <div key={label} className="border-border bg-muted/40 rounded-lg border p-4">
                <p className="text-foreground text-sm font-semibold">{label}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">{text}</p>
              </div>
            ))}
          </div>
          <p>
            You can open the workspace and try a problem without an account. Signing in with Google
            or GitHub unlocks the interviewer itself: the free plan includes 8 full AI sessions a
            month. If you want to build fundamentals first, the free{" "}
            <Link href="/learn/python">Python</Link>,{" "}
            <Link href="/learn/data-engineering">SQL</Link>, and{" "}
            <Link href="/learn/system-design">System Design</Link> courses run in your browser.
          </p>
        </>
      ),
    },
    {
      heading: "What a free session includes",
      content: (
        <ul className="list-disc space-y-2 pl-6">
          <li>
            A problem drawn from core interview patterns, like two pointers, sliding window, or
            graphs.
          </li>
          <li>Voice or text. Explain your approach out loud or type it.</li>
          <li>
            A scored rubric after you submit, covering communication, problem solving, and code
            quality, not just whether the tests pass.
          </li>
        </ul>
      ),
    },
  ]

  const faqs = [
    {
      question: "Do I need an account to try it?",
      answer:
        "You can open a problem and run code without one. The AI interviewer needs a free account, which takes one click with Google or GitHub and includes 8 full sessions a month.",
    },
    {
      question: "Do I need to put in a credit card?",
      answer:
        "No. The free plan includes 8 full interview sessions every month with complete AI feedback on each one. Pro exists for people who want 35 sessions a month plus spaced repetition and a personalized roadmap.",
    },
    {
      question: "Can I choose the question difficulty?",
      answer:
        "Yes. The free plan spans core interview patterns and difficulties, so you pick where to start. Pro adds more sessions and finer control over topic and difficulty.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Free AI coding interview practice"
      subtitle="Free plan"
      heroDescription="Pick a problem, talk through your approach, and code against real tests while an AI interviewer reacts as you work. The free plan includes 8 full sessions a month."
      primaryKeyword="free coding interview practice"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
