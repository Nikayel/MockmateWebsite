import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import { PRICING_CONFIG } from "@/lib/config"
import { SCORING } from "@/lib/constants"
import { listSystemDesignDrills } from "@/components/tutorials/SystemDesignDrills"
import { listCourseEntries } from "@/lib/tutorials/course-catalog"

/**
 * /system-design-interview-practice — brief section 6 asks this page to show the
 * workflow, an example prompt, the evaluation criteria, and what feedback looks
 * like. The page used to describe system design interviews in general, which any
 * blog post can do, and said almost nothing about what happens here.
 *
 * The one thing this page must not do is blur the two surfaces, because they
 * work differently and one of them costs a metered session:
 *
 *   Course exercises  free, self-compared against a model answer, NOT auto-graded
 *                     (lib/tutorials/types.ts: "This is NOT an autograder and
 *                     must not become one")
 *   Drills            the full round: AI interviewer, design notes, a 0-100 score
 *                     on submit, and it spends one interview session
 *
 * Counts are derived, never typed: `listSystemDesignDrills` reads the scenario
 * registry and `listCourseEntries` reads the curriculum, so a thirteenth drill or
 * a new level cannot leave this page quoting a stale number.
 */

const DRILL_COUNT = listSystemDesignDrills().length
const SD_LESSON_COUNT = listCourseEntries("system-design").length

export const metadata: Metadata = {
  title: "System Design Interview Practice",
  description: `What a design round here involves: the workflow, an example prompt, the four scoring criteria, and the feedback. Plus a free ${SD_LESSON_COUNT}-lesson course.`,
  alternates: {
    canonical: "/system-design-interview-practice",
  },
}

/**
 * The four parts the result screen breaks a drill score into, with the weights
 * read from the scorer rather than typed here.
 *
 * Each description says what that part of the score ACTUALLY responds to in
 * `lib/feedback/scoring/system-design-scoring.ts`, which is not always what the
 * label suggests. "Scalability" in particular is computed from how far the
 * conversation ran, not from any reading of load or storage, so this page
 * describes it that way. Writing the flattering version would be advertising a
 * measurement the product does not take.
 */
const SCORE_CRITERIA: { name: string; weight: number; what: string }[] = [
  {
    name: "Requirements",
    weight: SCORING.SYSTEM_DESIGN_WEIGHTS.UNDERSTANDING,
    what: "Whether you explained your approach before building, and how well.",
  },
  {
    name: "Architecture",
    weight: SCORING.SYSTEM_DESIGN_WEIGHTS.PROBLEM_SOLVING,
    what: "Whether you weighed alternatives, and whether you thought about the cases that break the design.",
  },
  {
    name: "Scalability",
    weight: SCORING.SYSTEM_DESIGN_WEIGHTS.CODE_QUALITY,
    what: "How far you carried the round. A design defended over a sustained back and forth scores above one asserted in two messages.",
  },
  {
    name: "Communication",
    weight: SCORING.SYSTEM_DESIGN_WEIGHTS.COMMUNICATION,
    what: "Whether your explanation held together and answered what was actually asked.",
  },
]

export default function SystemDesignInterviewPracticePage() {
  const contentSections = [
    {
      heading: "Two surfaces, and they are not the same thing",
      content: (
        <>
          <p>
            A coding problem has a right answer. System design does not: it is an open-ended
            conversation about trade-offs, and about how you handle ambiguity when there is no
            single correct diagram. Practising that alone is the hard part. A book can explain
            consistency models. It will not ask a follow-up when your answer leaves a gap.
          </p>
          <p>There are two ways to work on it here, and it is worth knowing which is which.</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Course exercises.</strong> The free{" "}
              <Link href="/learn/system-design">System Design course</Link> runs {SD_LESSON_COUNT}{" "}
              lessons. Each one teaches a building block, then asks you to write your own design
              answer before it will show you a model one. Nothing is auto-graded on purpose: you
              save your answer, unlock the model answer, and compare. That is free, it needs only an
              account, and it never spends an interview session.
            </li>
            <li>
              <strong>Drills.</strong> {DRILL_COUNT} open-ended briefs, each the whole round with an
              AI interviewer, ending in a score and a written report. A drill spends one of your
              monthly interview sessions, {PRICING_CONFIG.free.sessionsPerMonth} of which come with
              the free plan. You start them from the Drills section of the course page.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "What a drill session looks like",
      content: (
        <>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              You pick a brief from the drill list. They run from a URL shortener at the easy end
              through a rate limiter, a distributed cache, and a notification system, up to
              Instagram, Uber, and a news feed.
            </li>
            <li>
              Some briefs ask which company you are interviewing at, because the expectations
              differ. Then you press start.
            </li>
            <li>
              The round opens in three columns: the brief with its functional and non-functional
              requirements and constraints, a notes editor, and the interviewer.
            </li>
            <li>
              The notes editor is not blank. It opens on a skeleton with four headings to fill in:
              requirements clarification, high-level architecture, data model, and API design. You
              write prose and bullets, not a diagram. There is no whiteboard here, deliberately, and
              your design lives as text.
            </li>
            <li>
              The interviewer does not wait to be asked. It reads what you are writing and
              interjects, pushing on choices you have made and on the ones you have skipped. You
              answer by typing or by voice.
            </li>
            <li>
              When you are ready you press Submit Design. The clock counts up rather than down, and
              nothing is submitted for you, so a round ends when you end it. The exception is a
              company with a published time limit, which gets a real countdown.
            </li>
          </ol>
        </>
      ),
    },
    {
      heading: "An example prompt",
      content: (
        <>
          <p>
            Course exercises are narrower than a full brief, which is the point: they drill one move
            at a time. This one is from the first level, on clarifying a vague prompt.
          </p>
          <blockquote className="border-border text-foreground my-6 border-l-2 py-1 pl-4 italic">
            Write the 3 to 5 clarifying questions you would ask for the bare prompt &ldquo;Design
            Twitter&rdquo;, and for each one show how a likely answer narrows the design.
          </blockquote>
          <p>
            Alongside it sits a short &ldquo;think about&rdquo; list rather than a hint that gives
            the move away: which product slice is actually in scope and what you will explicitly
            defer, what you need to know about actors, scale, and read/write mix before drawing
            anything, and how you avoid analysis paralysis inside three to five questions.
          </p>
          <p>
            A drill brief is the other end of the range: an open statement of a product to design,
            with its requirements and constraints listed, and 45 to 60 minutes of conversation to
            get there.
          </p>
        </>
      ),
    },
    {
      heading: "How a drill is scored",
      content: (
        <>
          <p>
            Submitting produces a score out of 100, broken into four parts. The interviewer reads
            the conversation and your design notes together, so a strong document with no
            explanation and a strong explanation with an empty document both score badly.
          </p>
          <div className="border-border my-6 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                The four criteria a system design drill is scored on, with their weights.
              </caption>
              <thead>
                <tr className="border-border bg-muted/40 border-b">
                  <th scope="col" className="text-foreground px-4 py-3 font-semibold">
                    Criterion
                  </th>
                  <th scope="col" className="text-foreground px-4 py-3 font-semibold">
                    Weight
                  </th>
                  <th scope="col" className="text-foreground px-4 py-3 font-semibold">
                    What it looks at
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {SCORE_CRITERIA.map((criterion) => (
                  <tr key={criterion.name}>
                    <th
                      scope="row"
                      className="text-foreground px-4 py-3 align-top font-medium whitespace-nowrap"
                    >
                      {criterion.name}
                    </th>
                    <td className="text-muted-foreground px-4 py-3 align-top whitespace-nowrap">
                      {Math.round(criterion.weight * 100)}%
                    </td>
                    <td className="text-muted-foreground px-4 py-3 align-top leading-6">
                      {criterion.what}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Communication carrying the same weight as architecture is not padding. In a real design
            round the interviewer only ever sees the version of your design that you managed to say
            out loud. Treat the number as a rough band rather than a verdict, though. The written
            report below it is the part worth reading twice.
          </p>
        </>
      ),
    },
    {
      heading: "What the feedback looks like",
      content: (
        <>
          <p>After a drill, the report comes back in four blocks:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>The short version.</strong> One paragraph on how the round went overall.
            </li>
            <li>
              <strong>What worked.</strong> The specific moves worth repeating, quoted back from
              what you actually did.
            </li>
            <li>
              <strong>Fix next.</strong> The gaps, ordered, rather than a list of everything that
              was not perfect.
            </li>
            <li>
              <strong>An action plan.</strong> What to do before the next round.
            </li>
          </ul>
          <p className="mt-4">
            The interviewer also closes out in the chat with a two or three sentence debrief, so the
            round ends like a conversation rather than a page refresh. The score and breakdown are
            saved to your session history.
          </p>
          <p>
            Course exercises end differently, because nothing there is graded. You save your answer,
            the model answer unlocks, and you compare the two yourself. Some exercises add a short
            rubric you score yourself against before the model answer appears, in that order on
            purpose: reading the model answer first makes an honest self-assessment impossible.
            Those self-scores stay in your browser and are never sent anywhere.
          </p>
          <p>
            If you want to see written feedback before spending anything, the{" "}
            <Link href="/samples">graded sample sessions</Link> are readable end to end.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Do I draw a diagram?",
      answer:
        "No. The design is written: a notes editor that opens on headings for requirements, architecture, data model, and API design, and a conversation with the interviewer alongside it. There is no whiteboard or canvas. If your target company runs a diagram-first round, practise the reasoning here and the drawing elsewhere.",
    },
    {
      question: "Does a system design round cost anything?",
      answer: `The ${SD_LESSON_COUNT}-lesson course and its design exercises are free with an account and never spend an interview session. A drill is a full AI-interviewed round, so it does spend one: the free plan carries ${PRICING_CONFIG.free.sessionsPerMonth} sessions a month, Pro carries ${PRICING_CONFIG.pro.sessionsPerMonth}.`,
    },
    {
      question: "Are system design interviews only for senior engineers?",
      answer:
        "They are weighted more heavily for senior roles, but simplified versions now show up for mid-level and even some new grad loops, usually scoped to a single API or a basic data model rather than a distributed system.",
    },
    {
      question: "Do I need the fundamentals before I start?",
      answer:
        "It helps. The free System Design course covers the building blocks, load balancers, caching, databases, consistency models, before you try a live round. You can also drill first if you would rather find the gaps than guess at them.",
    },
  ]

  return (
    <LandingPageTemplate
      title="System design interview practice"
      subtitle="System design"
      heroDescription={`Write a design, defend it while an AI interviewer questions the choices you made, and get it scored. ${DRILL_COUNT} open-ended briefs, plus a free ${SD_LESSON_COUNT}-lesson course if the fundamentals are still shaky.`}
      primaryKeyword="system design interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
