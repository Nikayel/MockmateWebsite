import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Free AI Coding Interview Practice",
  description:
    "Try a free mock coding interview with our AI. Practice data structures, algorithms, and system design without a credit card.",
  alternates: {
    canonical: "/free-ai-coding-interview",
  },
}

export default function FreePracticePage() {
  const contentSections = [
    {
      heading: "Try CodeSparring for Free",
      content: (
        <>
          <p>
            The best way to understand the power of an AI interviewer is to experience it yourself.
            We offer a completely free, interactive mock interview round so you can see exactly how
            the AI evaluates your problem-solving, communication, and coding efficiency.
          </p>
          <div className="my-8 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Reasoning", "Talk through assumptions before the code."],
                ["Execution", "Run tests and inspect the result."],
                ["Feedback", "Leave with the next best rep."],
              ].map(([label, text]) => (
                <div key={label} className="rounded-lg border border-cyan-300/15 bg-cyan-300/5 p-4">
                  <p className="text-sm font-semibold text-cyan-100">{label}</p>
                  <p className="mt-1 text-sm text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <p>
            Ready to jump in? Create a free account and start your first full AI mock interview. No
            credit card required. Want to shore up the basics first? Our free{" "}
            <Link href="/learn/python">Python</Link>, <Link href="/learn/sql">SQL</Link>, and{" "}
            <Link href="/learn/system-design">System Design</Link> courses run right in your browser.
          </p>
        </>
      ),
    },
    {
      heading: "What to Expect in Your Free Round",
      content: (
        <>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>A Realistic Question:</strong> You'll be given a problem that tests a core
              FAANG pattern (e.g., Two Pointers or Sliding Window).
            </li>
            <li>
              <strong>Voice or Text:</strong> You can communicate via microphone or typing.
            </li>
            <li>
              <strong>Instant Scorecard:</strong> After you submit your solution, you'll instantly
              receive a detailed rubric grading your performance.
            </li>
          </ul>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Do I need to put in a credit card?",
      answer:
        "No. The free plan includes 8 full interview sessions every month across 20+ problems, with complete AI feedback on every session. You only upgrade to Pro if you want 35 interview sessions a month plus spaced repetition scheduling and a personalized roadmap.",
    },
    {
      question: "Can I choose the question difficulty?",
      answer:
        "The free plan includes 20+ problems spanning core interview patterns and difficulties, so you can pick where to start. Pro users get 35 interview sessions a month and can customize their difficulty and exact topic.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Free AI Coding Interview"
      subtitle="Experience the Simulator"
      heroDescription="Take a completely free AI mock interview. Test your skills, get instant feedback on your communication and code, and see exactly where you stand before the real thing."
      primaryKeyword="free coding interview practice"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
