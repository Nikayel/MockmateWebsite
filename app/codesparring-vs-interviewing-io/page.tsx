import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs Interviewing.io | Mock Interview Platform Comparison",
  description:
    "Compare CodeSparring and Interviewing.io. Discover the pros and cons of AI mock interviews versus human interviewers for software engineering prep.",
  alternates: {
    canonical: "/codesparring-vs-interviewing-io",
  },
}

export default function VsInterviewingIoPage() {
  const contentSections = [
    {
      heading: "Human vs AI Mock Interviews",
      content: (
        <>
          <p>
            Interviewing.io is widely considered the gold standard for human-to-human mock
            interviews. You pay to practice anonymously with a verified Senior Engineer from a
            top-tier company (like Google, Meta, or Amazon).
          </p>
          <p>
            CodeSparring takes a different approach: we use advanced AI to simulate that exact
            experience. Instead of scheduling time with a human, you can practice 24/7 with an AI
            trained on the exact same rubrics used by FAANG engineers.
          </p>
        </>
      ),
    },
    {
      heading: "Cost and Scalability",
      content: (
        <>
          <p>
            The biggest difference is cost and availability. A single mock interview on
            Interviewing.io typically costs between $150 and $250. This limits most candidates to
            doing 1 or 2 mock interviews before their real onsite.
          </p>
          <p>
            CodeSparring offers 35 AI mock interview sessions a month for a fraction of the cost of a
            single human session. This allows you to practice <em>often</em>, building the muscle
            memory needed to cure interview anxiety completely.
          </p>
        </>
      ),
    },
    {
      heading: "The Ideal Preparation Strategy",
      content: (
        <>
          <p>
            We don't believe AI replaces human interviewers entirely. The best strategy is a hybrid
            approach:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Step 1:</strong> Use CodeSparring to do 10-20 mock interviews. Make all your
              silly mistakes with the AI. Get your timing down, learn to talk while typing, and
              master the core patterns.
            </li>
            <li>
              <strong>Step 2:</strong> Once you are consistently passing the AI mock interviews,
              book 1 session on Interviewing.io as a final "dress rehearsal" before your real
              onsite.
            </li>
          </ul>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Does the AI give as good feedback as a human?",
      answer:
        "Our AI is highly consistent and trained on specific grading rubrics (communication, problem-solving, code quality). While a human might offer subjective industry anecdotes, the AI is often better at catching specific time-complexity errors and code inefficiencies.",
    },
    {
      question: "Is the AI voice-enabled?",
      answer:
        "Yes, CodeSparring features low-latency voice chat, so the conversational flow feels very similar to a real phone screen or Zoom interview.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs Interviewing.io"
      subtitle="AI vs Human Mock Interviews"
      heroDescription="Interviewing.io offers incredible human mock interviews, but they are expensive. Learn how to use CodeSparring's AI to get 10x the practice at a fraction of the cost."
      primaryKeyword="mock interview platform"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
