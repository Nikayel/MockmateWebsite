import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Software Engineer Interview Practice",
  description:
    "Comprehensive interview practice for Software Engineers. Prepare for coding, system design, and behavioral rounds with our AI interviewer simulator.",
  alternates: {
    canonical: "/software-engineer-interview-practice",
  },
}

export default function SWEInterviewPracticePage() {
  const contentSections = [
    {
      heading: "The Full Software Engineering Loop",
      content: (
        <>
          <p>
            Landing a job as a Software Engineer isn't just about passing a single coding test. You
            have to survive the "loop," a grueling series of 4 to 6 interviews covering algorithms,
            system design, practical coding, and behavioral questions.
          </p>
          <p>
            CodeSparring is the only platform that offers comprehensive, end-to-end simulation for
            the entire software engineering interview loop.
          </p>
        </>
      ),
    },
    {
      heading: "How to Prepare for the Loop",
      content: (
        <>
          <p>Our AI interviewer allows you to practice every round you'll face:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>The Phone Screen:</strong> 45-minute algorithmic coding rounds focused on fast
              problem-solving and clear communication.
            </li>
            <li>
              <strong>The Onsite Technical:</strong> Deep-dive coding rounds where you must optimize
              solutions and handle edge cases.
            </li>
            <li>
              <strong>System Design:</strong> High-level architecture discussions for Mid-level and
              Senior roles.
            </li>
            <li>
              <strong>Practical / Real-World:</strong> Bug-fix and add-functionality rounds that
              test your ability to work in existing codebases.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "Feedback That Actually Helps",
      content: (
        <>
          <p>
            Most engineers fail interviews not because they can't code, but because they fail to
            communicate. They stay silent while thinking, they jump into coding before clarifying
            requirements, or they struggle to articulate their time/space complexity.
          </p>
          <p>
            CodeSparring's AI gives you a detailed scorecard on your soft skills, communication, and
            technical accuracy, ensuring you walk into your real interview with confidence.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Is this suitable for frontend, backend, or full-stack engineers?",
      answer:
        "Yes! We have specialized question banks for frontend (React/DOM manipulation), backend (API design/SQL), and generalist software engineering roles.",
    },
    {
      question: "How long is a typical mock interview?",
      answer:
        "You can customize the length, but our standard mock interviews are designed to simulate a real 45-minute round.",
    },
    {
      question: "Can I practice behavioral questions?",
      answer:
        "While our core focus is technical rounds (coding and system design), our AI is equipped to handle standard behavioral intro questions commonly asked at the start of technical screens.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Software Engineer Interview Practice"
      subtitle="Conquer the Interview Loop"
      heroDescription="Prepare for the full software engineering interview loop. Practice coding, system design, and real-world rounds with an AI interviewer that grades your performance and communication."
      primaryKeyword="software engineer interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
