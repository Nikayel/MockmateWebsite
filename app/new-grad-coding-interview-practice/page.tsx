import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "New Grad Coding Interview Practice",
  description:
    "Practice entry-level and new grad software engineering interviews. Master DSA, LeetCode style questions, and behavioral rounds for your first tech job.",
  alternates: {
    canonical: "/new-grad-coding-interview-practice",
  },
}

export default function NewGradInterviewPracticePage() {
  const contentSections = [
    {
      heading: "Breaking into Tech as a New Grad",
      content: (
        <>
          <p>
            The entry-level job market is incredibly competitive. As a university student or recent
            bootcamp grad, your resume might get you an online assessment (OA) or a phone screen,
            but your interview performance is what lands you the offer.
          </p>
          <p>
            New grad interviews heavily index on Data Structures and Algorithms (DSA) because
            companies don't expect you to have deep architectural experience. They want to see how
            you think, how quickly you learn, and how well you communicate.
          </p>
        </>
      ),
    },
    {
      heading: "From LeetCode to Real Interviews",
      content: (
        <>
          <p>
            Many new grads make the mistake of silently grinding LeetCode and assuming they are
            ready. But in a real interview, if you don't talk, you fail.
          </p>
          <p>
            Our AI interviewer simulator forces you to practice the skills that actually matter:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Asking clarifying questions before writing a single line of code.</li>
            <li>Explaining your brute-force approach before attempting an optimized solution.</li>
            <li>Talking through your time and space complexity (Big O).</li>
            <li>Handling hints gracefully when you inevitably get stuck.</li>
          </ul>
          <p className="mt-4">
            DSA is not the whole loop, either. Many intern and new-grad OAs now include bug-fix
            rounds where you diagnose a failing feature in an unfamiliar codebase, and data
            engineering screens lean on SQL. CodeSparring covers both: bug-hunt scenarios set in a
            real multi-file project, and SQL practice that runs against a live in-browser database.
          </p>
        </>
      ),
    },
    {
      heading: "Build Confidence and Cure Interview Anxiety",
      content: (
        <>
          <p>
            Interview anxiety is the #1 reason qualified new grads fail technical screens. The only
            way to cure it is through exposure and practice.
          </p>
          <p>
            CodeSparring provides a zero-judgment environment. You can stumble, freeze up, and make
            mistakes with our AI interviewer, and get actionable, empathetic feedback on how to
            improve before you face a real hiring manager.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "What languages should I use for a new grad interview?",
      answer:
        "Use the language you are most comfortable with. In real loops, Python, Java, and C++ are the most common for DSA rounds, and JavaScript/TypeScript are widely accepted. On CodeSparring, JavaScript, TypeScript, and Python run directly in your browser with executable tests. Java, C++, C#, Go, and Rust are available in the editor for writing and discussing solutions, without in-browser execution.",
    },
    {
      question: "Do new grads get asked system design questions?",
      answer:
        "Rarely, but it's becoming more common for competitive roles (like FAANG). Usually, it's a simplified version focusing on APIs or database schemas rather than large-scale distributed systems.",
    },
    {
      question: "How much should I practice?",
      answer:
        "We recommend focusing on mastering the core 15 DSA patterns rather than doing hundreds of random problems. Doing 1 mock interview a day for 2 weeks will dramatically improve your communication skills.",
    },
  ]

  return (
    <LandingPageTemplate
      title="New Grad Coding Interview Practice"
      subtitle="Land Your First Tech Job"
      heroDescription="Practice what intern and new-grad loops actually run: DSA with a live AI interviewer, bug hunts in a real codebase, and SQL for data engineering screens. Free to start, no credit card."
      primaryKeyword="new grad coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
