import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "How to Practice Bug-Fix Interviews",
  description:
    "How to prepare for bug-fix and debugging interview rounds: reproduce the error, say your hypothesis out loud, then trace and fix it.",
  alternates: {
    canonical: "/guides/how-to-practice-bug-fix-interviews",
  },
}

export default function BugFixGuidePage() {
  const contentSections = [
    {
      heading: "Why bug-fix rounds show up",
      content: (
        <>
          <p>
            Most of the code a working engineer touches already exists. You are reading a function
            someone else wrote, figuring out why it broke, and changing it without breaking
            something else. A bug-fix round tests that directly instead of asking you to write an
            algorithm from a blank file.
          </p>
          <p>
            You get a codebase you have never seen, a failing test, and a description of what should
            happen. The job is to find the cause, explain it, and fix it while the interviewer
            watches.
          </p>
        </>
      ),
    },
    {
      heading: "A framework for the round",
      content: (
        <>
          <p>Do not start changing code the moment you spot the bug. Work through it in order.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-6">
            <li>
              <strong>Reproduce it first.</strong> Run the code and trigger the bug yourself before
              you touch anything. Say out loud what you expected to happen and what actually
              happened.
            </li>
            <li>
              <strong>State your hypothesis before you go looking.</strong> "The array is coming
              back undefined, so I think the index is going out of bounds somewhere in this loop." A
              wrong hypothesis said out loud still counts as progress. A silent guess does not.
            </li>
            <li>
              <strong>Trace it, don't guess.</strong> Add a print statement or step through with a
              debugger and watch the actual values change. If you are editing code and rerunning it
              without a clear idea of what you are testing, stop and go back to tracing.
            </li>
            <li>
              <strong>Fix it, then check what else it touches.</strong> Make the smallest change
              that addresses the root cause, rerun the full test suite, and say which edge cases you
              checked before you call it done.
            </li>
          </ol>
        </>
      ),
    },
    {
      heading: "How to practice it",
      content: (
        <>
          <p>
            Grinding more algorithm problems does not train this skill, because there is no
            unfamiliar codebase to get lost in. You need a project you did not write, a failing
            test, and something at stake if you fix the wrong thing.
          </p>
          <p>
            CodeSparring's debugging rounds drop you into a real codebase with a failing test and
            score how you diagnose and fix it, not just whether the test goes green afterward. See{" "}
            <Link href="/rounds">how a full round runs</Link> before you start one.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Are bug-fix interviews harder than algorithmic interviews?",
      answer:
        "They test a different skill, not a higher difficulty. Comfort with algorithms carries you further in a DSA round. Comfort reading someone else's code under pressure carries you further here.",
    },
    {
      question: "What if I can't find the bug in time?",
      answer:
        "Say what you have ruled out and why. Interviewers are watching your process, not just waiting for the fix. A candidate who narrows down the cause but runs out of time can still score well. A candidate who goes quiet and starts randomly changing lines usually does not.",
    },
    {
      question: "Do I need to know the language cold?",
      answer:
        "You need to read it comfortably, not know every method by heart. If you don't recognize a function, say so and check what it does instead of guessing in silence.",
    },
  ]

  return (
    <LandingPageTemplate
      title="How to practice bug-fix interviews"
      subtitle="Guide"
      heroDescription="A framework for debugging interviews: reproduce the bug, say what you think is happening, trace it, then fix it without breaking anything else."
      primaryKeyword="bug-fix interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
