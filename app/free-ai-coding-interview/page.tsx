import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import { InteractiveTour } from "@/components/InteractiveTour"

export const metadata: Metadata = {
  title: "Free AI Coding Interview Practice | CodeSparring",
  description:
    "Try a free mock coding interview with our AI. Practice data structures, algorithms, and system design without a credit card.",
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
          <div className="my-8 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-4">
            <InteractiveTour />
          </div>
          <p>
            Ready to jump into the real thing? Click below to start your first full, uninterrupted
            AI mock interview—no credit card required.
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
        "No. Your first practice round is completely free. You only upgrade if you want unlimited access to our entire question bank and advanced scenarios (like System Design and Bug-Fix).",
    },
    {
      question: "Can I choose the question difficulty?",
      answer:
        "The free tier provides a curated medium-difficulty problem designed to test your communication skills. Premium users can customize their difficulty and exact topic.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Free AI Coding Interview"
      subtitle="Experience the Simulator"
      heroDescription="Take a completely free AI mock interview. Test your skills, get instant feedback on your communication and code, and see why thousands of engineers use CodeSparring."
      primaryKeyword="free coding interview practice"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
