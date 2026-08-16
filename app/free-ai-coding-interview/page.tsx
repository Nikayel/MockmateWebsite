import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import { PRICING_CONFIG } from "@/lib/config"
import { PRO_AI_LIMIT_MULTIPLIER } from "@/lib/pricing"
import { listCourseEntries } from "@/lib/tutorials/course-catalog"

/**
 * /free-ai-coding-interview — the transactional "what is actually free" page.
 *
 * This page and /ai-coding-interview-practice used to make the SAME claims in
 * different words: patterns, the rubric, voice or text. Two pages arguing the
 * same case is one page's worth of value split in half, and search picks a
 * winner on its own. The split is now by INTENT, and it is enforced by what each
 * page is allowed to say:
 *
 *   /ai-coding-interview-practice  owns the product experience: the patterns,
 *                                  the rubric, voice, what a session feels like.
 *   /free-ai-coding-interview      owns the offer: the no-account trial and its
 *                                  real boundary, the metered allowance and when
 *                                  it resets, and what Pro adds that free lacks.
 *
 * Every number here is read from the config the server enforces, and every
 * capability claim was traced to the code that grants or refuses it. The
 * guest boundary in particular is narrower than a marketing page would like:
 * an anonymous visitor gets the editor and the test runner, NOT the AI
 * interviewer, because `/api/chat` and `/api/feedback/stream` require a Firebase
 * token (lib/quota-enforcement.ts `requireAuth`). Saying otherwise would be
 * selling a wall.
 */

const FREE_SESSIONS = PRICING_CONFIG.free.sessionsPerMonth

// Derived at build time from the server-only course catalog, the same way
// /pricing does it, so this page can never advertise a lesson count the
// curriculum does not contain.
const TOTAL_LESSONS =
  listCourseEntries("python").length +
  listCourseEntries("data-engineering").length +
  listCourseEntries("system-design").length

export const metadata: Metadata = {
  title: "Free AI Coding Interview",
  description: `Exactly what is free: one mock interview with no account, ${FREE_SESSIONS} AI sessions a month once you sign up, and all ${TOTAL_LESSONS} course lessons. No credit card.`,
  alternates: {
    canonical: "/free-ai-coding-interview",
  },
}

export default function FreePracticePage() {
  const contentSections = [
    {
      heading: "What you get with no account at all",
      content: (
        <>
          <p>
            Most &quot;free&quot; interview tools mean free after you hand over an email. You can
            open <Link href="/interview">the workspace</Link> here with neither, and the trial is
            one session. It is stored against your browser, so it is not a per-person count and we
            do not pretend otherwise. Starting a session does not spend it. The trial is marked used
            when you finish one and see your result.
          </p>
          <p>Without an account, in that session, you can:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Open any scenario in the catalog. Nothing is locked behind the signup wall.</li>
            <li>Read the problem and write your solution in the browser editor.</li>
            <li>
              Run the tests and submit, in JavaScript, TypeScript, or Python. The code runs inside
              your browser, so there is no queue and no execution quota.
            </li>
            <li>See how many of the tests your solution passed.</li>
            <li>Keep the work. If you sign up afterwards, that session moves into your account.</li>
          </ul>
          <p className="mt-4">
            The honest limit: the AI interviewer is not in that trial. Message it and you get a
            signup card instead of an answer, and voice and the written feedback report are behind
            the same door. Those are the parts that cost us money on every run, so they need an
            account. Everything above genuinely does not.
          </p>
        </>
      ),
    },
    {
      heading: `What a free account adds, and when it resets`,
      content: (
        <>
          <p>
            An account is one click with Google or GitHub, takes no card, and turns the interviewer
            on: {FREE_SESSIONS} full AI interview sessions every month, each with the complete
            written feedback report at the end.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>The month is yours, not the calendar&apos;s.</strong> The allowance resets on
              the monthly anniversary of the day you signed up, not on the 1st. Sign up on the 22nd
              and your sessions come back on the 22nd. If you sign up on the 31st, short months
              reset on their last day.
            </li>
            <li>
              <strong>Re-opening your work is free.</strong> Starting a session spends one of the{" "}
              {FREE_SESSIONS} and grants ten free opens, so going back into a problem to try it
              again does not cost another session until those ten are used.
            </li>
            <li>
              <strong>Courses never touch the counter.</strong> All {TOTAL_LESSONS} lessons across
              the <Link href="/learn/python">Python</Link>,{" "}
              <Link href="/learn/data-engineering">Data Engineering</Link>, and{" "}
              <Link href="/learn/system-design">System Design</Link> courses are free for every
              account, forever, and none of them spend an interview session.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "What the free plan does not include",
      content: (
        <>
          <p>
            Free is a real plan rather than a trial with a timer, so the fairest thing we can do is
            tell you what it leaves out. These are the Pro features, and none of them are needed to
            sit an interview:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Spaced repetition scheduling.</strong> Free sessions are not queued for review
              later, so remembering to come back to a weak pattern is on you.
            </li>
            <li>
              <strong>The tailored roadmap.</strong> No prep plan built around your target company,
              role, and skill gaps.
            </li>
            <li>
              <strong>Pattern mastery tracking.</strong> You see individual session results, not a
              running read of which patterns you have actually mastered.
            </li>
            <li>
              <strong>The open learner model.</strong> Pro lets you inspect and argue with the
              AI&apos;s assessment of your skills. Free does not.
            </li>
            <li>
              <strong>Higher AI throughput.</strong> Pro raises the per-minute request and token
              limits {PRO_AI_LIMIT_MULTIPLIER}x, which matters in a fast back-and-forth.
            </li>
            <li>
              <strong>More sessions.</strong> {PRICING_CONFIG.pro.sessionsPerMonth} a month instead
              of {FREE_SESSIONS}.
            </li>
          </ul>
          <p className="mt-4">
            The full breakdown, with prices, is on <Link href="/pricing">the pricing page</Link>.
          </p>
        </>
      ),
    },
    {
      heading: "What the interview itself is like",
      content: (
        <p>
          This page is about the offer, not the experience. If what you want to know is how the
          interviewer behaves, which patterns the scenarios cover, and what the scored report
          actually says, that is on the{" "}
          <Link href="/ai-coding-interview-practice">AI coding interview practice page</Link>. You
          can also read a <Link href="/samples">graded sample session</Link> end to end before
          spending anything, including a click.
        </p>
      ),
    },
  ]

  const faqs = [
    {
      question: "Do I need an account to try it?",
      answer:
        "Not to open a problem, write code, run the tests, and submit. That much works with no account and no email. The AI interviewer, voice, and the written feedback report need a free account, which is one click with Google or GitHub.",
    },
    {
      question: "Do I need to put in a credit card?",
      answer: `No, and there is no card on the free plan at any point. It includes ${FREE_SESSIONS} full interview sessions every month with complete AI feedback on each one, plus every course lesson. Pro exists for people who want ${PRICING_CONFIG.pro.sessionsPerMonth} sessions a month plus spaced repetition, a tailored roadmap, and pattern mastery tracking.`,
    },
    {
      question: "When do my free sessions reset?",
      answer: `On the monthly anniversary of your signup date, not on the 1st of the month. If you signed up on the 9th, the counter returns to zero used on the 9th. For signup days later than a short month allows, the reset lands on that month's last day.`,
    },
    {
      question: "Are the courses really free, or free until a paywall?",
      answer: `Really free. All ${TOTAL_LESSONS} lessons across the Python, Data Engineering, and System Design courses are open to every account, and working through them never spends an interview session. They are the same lessons a Pro subscriber sees.`,
    },
    {
      question: "What happens when I run out of sessions?",
      answer: `The courses, the editor, and the test runner keep working. The AI interviewer stops until your allowance resets on your signup anniversary, or until you upgrade.`,
    },
  ]

  return (
    <LandingPageTemplate
      title="Free AI coding interview"
      subtitle="Free plan"
      heroDescription={`One mock interview with no account and no email, then ${FREE_SESSIONS} AI-interviewed sessions a month once you sign up, and all ${TOTAL_LESSONS} course lessons free for good. Here is exactly where each line falls.`}
      primaryKeyword="free AI coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
