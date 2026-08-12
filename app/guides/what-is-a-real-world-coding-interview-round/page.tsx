import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "What Is a Real-World Coding Interview Round?",
  description:
    "What real-world interview rounds are: bug fixes, feature additions, and take-home reviews, and how they differ from algorithm-only interviews.",
  alternates: {
    canonical: "/guides/what-is-a-real-world-coding-interview-round",
  },
}

export default function RealWorldGuidePage() {
  const contentSections = [
    {
      heading: "Why these rounds exist",
      content: (
        <>
          <p>
            An algorithm interview tests whether you can solve a well-defined problem in a fixed
            amount of time. It says less about whether you can work inside code you did not write,
            which is most of what the job actually involves.
          </p>
          <p>
            A real-world round hands you something closer to the job itself: an existing project, a
            scoped task, and a limited amount of time to make a defensible change.
          </p>
        </>
      ),
    },
    {
      heading: "The three formats",
      content: (
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Bug fix:</strong> you get a codebase with a failing test and a description of
            what is wrong. You reproduce the error, trace it, and fix it while explaining your
            reasoning.
          </li>
          <li>
            <strong>Add a feature:</strong> you get a working app and a small, scoped request, like
            adding pagination to a list component. You read the existing patterns in the code before
            you add your own.
          </li>
          <li>
            <strong>Take-home plus review:</strong> you build something over a few hours on your own
            time, then defend the choices you made in a live conversation. The finished code matters
            less than your answers about why you wrote it that way.
          </li>
        </ul>
      ),
    },
    {
      heading: "How to prepare",
      content: (
        <>
          <p>
            Get comfortable reading code you did not write. Open an unfamiliar repository, pick a
            function, and explain out loud what it does before you run it. Know your way around your
            editor's debugger and Git well enough that neither one interrupts your train of thought.
          </p>
          <p>
            CodeSparring's debugging rounds put you in a real codebase with a failing test that a
            verified pack runs against your fix, and its case labs cover forward-deployed
            engineering work like a 911 dispatch system, an ontology build, and a Stripe billing
            webhook. See <Link href="/rounds">what a full round looks like</Link> before you start
            one.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Are real-world rounds harder than algorithmic rounds?",
      answer:
        "They call for a different kind of preparation, not a harder one. If you have built and maintained your own projects, the format will feel more natural than a pure algorithm puzzle. If you have only drilled algorithms, spend extra time practicing on code you did not write.",
    },
    {
      question: "Do I still need to know algorithms?",
      answer:
        "Usually, yes. A real-world round tends to replace one round in the loop, not the whole process. Ask what the rest of the loop covers so you know where to put your prep time.",
    },
    {
      question: "How do I practice reading code I did not write?",
      answer:
        "Pick an open-source repository in a language you know, open a file you have never seen, and explain what it does before you run it. Then break something on purpose and fix it. That rehearsal is closer to a real-world round than another isolated algorithm problem.",
    },
  ]

  return (
    <LandingPageTemplate
      title="What is a real-world coding interview round?"
      subtitle="Guide"
      heroDescription="Some interview loops skip algorithms and hand you a real codebase instead. Here is what those rounds actually look like and how to prepare for one."
      primaryKeyword="real-world coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
