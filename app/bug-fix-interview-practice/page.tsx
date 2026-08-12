import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Bug-Fix Interview Practice",
  description:
    "Practice debugging interview rounds with an AI interviewer: a broken codebase, a failing test, and a verified pack that runs your fix against the suite.",
  alternates: {
    canonical: "/bug-fix-interview-practice",
  },
}

export default function BugFixInterviewPracticePage() {
  const contentSections = [
    {
      heading: "The debugging round",
      content: (
        <>
          <p>
            Not every interview round starts from a blank editor. Some hand you an existing codebase
            with a failing test and ask you to find out why. You are debugging, not building from
            scratch: reading code you did not write, forming a hypothesis, and checking it before
            you touch anything.
          </p>
          <p>
            It is a round that is hard to fake, and hard to practice with a plain problem set, since
            those start from nothing. CodeSparring&apos;s debugging rounds start from a real, broken
            codebase with a failing test, and a verified pack runs your code against the actual test
            suite, not a guess at whether your fix looks right.
          </p>
        </>
      ),
    },
    {
      heading: "What the round tests",
      content: (
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Reading unfamiliar code:</strong> how fast you can orient yourself in a file you
            did not write.
          </li>
          <li>
            <strong>Forming a hypothesis:</strong> stating what you think is wrong before you start
            changing things.
          </li>
          <li>
            <strong>Verifying it:</strong> running the failing test and checking your fix against
            the real suite, not assuming it worked.
          </li>
          <li>
            <strong>Not breaking the rest:</strong> a fix that passes the one test you were shown
            but breaks another is not a fix.
          </li>
        </ul>
      ),
    },
    {
      heading: "How a session runs",
      content: (
        <>
          <p>
            You get an editor with a real, multi-file project and a test that is failing. An AI
            interviewer, playing the role of a teammate, asks what you think is going on before you
            start editing. Code execution happens in your browser: Python runs on Pyodide,
            JavaScript and TypeScript run sandboxed, and you see the actual stack trace when a test
            fails.
          </p>
          <p>
            State your hypothesis before you touch the code, something like: &quot;the pagination
            logic looks off by one, I want to log the index here to check.&quot; Say it out loud or
            type it, then verify it by running the test. See both the bug-fix and case lab formats
            on the <Link href="/rounds">rounds page</Link>, or go deeper with{" "}
            <Link href="/labs">case labs</Link>, longer engineering scenarios modeled on real
            company work.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "What languages do the debugging rounds support?",
      answer:
        "Python, JavaScript, and TypeScript run in your browser, Python through Pyodide and JavaScript/TypeScript sandboxed. You run the real test suite and see the actual stack traces, not a simulated result.",
    },
    {
      question: "Do I actually run the code, or just describe the fix?",
      answer:
        "You run it. A verified pack runs your code against the real test suite behind the scenario, so passing means the fix works, not that it sounds right.",
    },
    {
      question: "How should I communicate during a debugging round?",
      answer:
        "State your hypothesis before you change anything, then verify it by running the test instead of assuming you're right. Something like: I think this is an off-by-one error in the pagination logic, so I'm going to log the index to check.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Bug-fix interview practice"
      subtitle="Debugging"
      heroDescription="Get dropped into a broken codebase with a failing test. State your hypothesis, run the code, and fix it while an AI interviewer asks what you think is going on. A verified pack checks your fix against the real test suite."
      primaryKeyword="bug-fix interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
