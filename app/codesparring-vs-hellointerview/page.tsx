import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs HelloInterview | AI Mock Interview Comparison",
  description:
    "Compare CodeSparring and HelloInterview. Find the best AI technical interview platform for coding, system design, and software engineering prep.",
  alternates: {
    canonical: "/codesparring-vs-hellointerview",
  },
}

export default function VsHelloInterviewPage() {
  const contentSections = [
    {
      heading: "The New Era of AI Mock Interviews",
      content: (
        <>
          <p>
            Both CodeSparring and HelloInterview represent the next generation of technical
            interview preparation: using Large Language Models to simulate the dynamic,
            conversational nature of real interviews.
          </p>
          <p>
            While both platforms are significantly better than grinding algorithms in silence, they
            have different philosophies and feature sets when it comes to preparing software
            engineers for their next role.
          </p>
        </>
      ),
    },
    {
      heading: "Where CodeSparring Excels",
      content: (
        <>
          <p>
            CodeSparring is built strictly around the <strong>Full Engineering Loop</strong>. Our
            core philosophy is that you shouldn't just practice algorithms; you should practice the
            exact formats you'll see at FAANG companies.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Bug-Fix & Real-World Scenarios:</strong> CodeSparring offers unique
              environments where you jump into broken codebases to fix bugs, rather than just
              writing greenfield algorithms.
            </li>
            <li>
              <strong>Low-Latency Voice Integration:</strong> Our voice-first approach forces you to
              practice the physical act of talking through a problem while typing.
            </li>
            <li>
              <strong>Spaced Repetition:</strong> CodeSparring integrates spaced-repetition
              scheduling for the concepts you fail, ensuring you actually learn from your mistakes.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "Choosing the Right Tool",
      content: (
        <>
          <p>
            Both tools offer fantastic AI feedback. If you are looking for specialized real-world
            scenarios (like debugging legacy code or adding functionality to an existing repo) and a
            deeply integrated voice experience, CodeSparring is the ideal choice.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Is CodeSparring cheaper than human mock interviews?",
      answer:
        "Yes. While human mock interviews can cost $150-$250 per hour, CodeSparring provides AI mock interviews for a fraction of that cost.",
    },
    {
      question: "Can I practice System Design on both?",
      answer:
        "Yes, both platforms support conversational system design scenarios, allowing you to practice architectural trade-offs. CodeSparring also includes a free System Design curriculum you can work through to build the fundamentals before you practice.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs HelloInterview"
      subtitle="Compare AI Mock Interviewers"
      heroDescription="Looking for the best AI interviewer? Compare features, pricing, and interview scenarios between CodeSparring and HelloInterview to make the right choice for your prep."
      primaryKeyword="AI mock interviewer"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
