import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Bug-Fix Interview Practice",
  description:
    "Practice debugging and bug-fix interviews with an AI interviewer. Learn to navigate existing codebases, trace errors, and apply robust fixes under pressure.",
  alternates: {
    canonical: "/bug-fix-interview-practice",
  },
}

export default function BugFixInterviewPracticePage() {
  const contentSections = [
    {
      heading: "The Rise of the Bug-Fix Interview",
      content: (
        <>
          <p>
            Companies are moving away from pure algorithmic puzzle questions and toward practical,
            "real-world" interview rounds. The Bug-Fix interview is becoming increasingly common at
            companies like Stripe, Palantir, and Netflix.
          </p>
          <p>
            Instead of writing code from scratch, you are given an existing (often messy) codebase
            with a failing test or a reported issue. Your task is to find the bug, explain why it's
            happening, and deploy a fix without breaking existing functionality.
          </p>
        </>
      ),
    },
    {
      heading: "What We Test in Bug-Fix Rounds",
      content: (
        <>
          <p>Our AI simulator evaluates you on the specific skills needed for debugging:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Code Comprehension:</strong> How quickly can you understand code you didn't
              write?
            </li>
            <li>
              <strong>Systematic Tracing:</strong> Do you use print statements/debuggers logically,
              or do you guess and check?
            </li>
            <li>
              <strong>Root Cause Analysis:</strong> Can you explain <em>why</em> the bug occurred,
              rather than just patching the symptom?
            </li>
            <li>
              <strong>Regression Prevention:</strong> Does your fix break other edge cases?
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "How to Practice Debugging",
      content: (
        <>
          <p>
            Practicing bug-fixes requires realistic scenarios. LeetCode doesn't offer this.
            CodeSparring provides realistic bug-fix scenarios in JavaScript and Python, each with a
            failing test you run in your browser.
          </p>
          <p>
            You'll be dropped into an editor with a broken application and an AI interviewer acting
            as your "Tech Lead." You must communicate your hypothesis, run the code, and discuss
            your proposed fix before implementing it. New to the format? Start with our{" "}
            <Link href="/guides/how-to-practice-bug-fix-interviews">
              guide to practicing bug-fix interviews
            </Link>
            .
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "What languages are supported for bug-fix interviews?",
      answer:
        "Bug-fix scenarios run in JavaScript and Python. You run the code and test suites directly in your browser and see the stack traces in real time.",
    },
    {
      question: "Do I get to run the code?",
      answer:
        "Yes. Our in-browser execution environment allows you to run the code, execute test suites, and see the stack traces in real-time.",
    },
    {
      question: "How do I communicate during a bug-fix interview?",
      answer:
        "Always state your hypothesis out loud before making changes. For example: 'I suspect the issue is an off-by-one error in the pagination logic. I'm going to log the index here to verify.'",
    },
  ]

  return (
    <LandingPageTemplate
      title="Bug-Fix Interview Practice"
      subtitle="Master Real-World Debugging"
      heroDescription="Drop into broken codebases, trace errors, and communicate your root cause analysis. Prepare for the practical interview rounds used by Stripe, Palantir, and modern tech companies."
      primaryKeyword="bug-fix interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
