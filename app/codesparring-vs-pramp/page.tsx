import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs Pramp | Mock Interview Comparison",
  description:
    "Compare CodeSparring and Pramp for mock interview practice. See how AI interviewer sessions differ from peer-to-peer swaps, and when each is worth your time.",
  alternates: {
    canonical: "/codesparring-vs-pramp",
  },
}

export default function VsPrampPage() {
  const contentSections = [
    {
      heading: "Pramp is now Exponent Practice",
      content: (
        <p>
          First, a naming note: Pramp was acquired by Exponent, and since 2024 its peer-to-peer
          sessions run on Exponent Practice. The format is the same and it is still free, so
          everything below about Pramp applies to Exponent Practice today. Exponent also sells a
          broader membership with courses; its own AI mock interviewer currently covers product
          management and behavioral rounds, and their page states it does not support technical
          interviews or live coding.
        </p>
      ),
    },
    {
      heading: "What Pramp does well",
      content: (
        <>
          <p>
            Pramp matches you with another engineer and splits an hour: you interview them for
            thirty minutes, then they interview you, at no cost. It is a real way to practice
            thinking out loud, and playing the interviewer for once is its own kind of practice,
            since you have to read someone else's code and decide what to ask about it.
          </p>
          <p>
            The trade-off is consistency. Both sides of a Pramp match are still learning, so the
            quality of the questions, the hints, and the feedback shifts from one session to the
            next.
          </p>
        </>
      ),
    },
    {
      heading: "What CodeSparring adds",
      content: (
        <>
          <p>
            CodeSparring's AI interviewer gives you the same bar every session. It probes the
            choices you make, follows the edits to your code, and takes the conversation by voice or
            text. You are not splitting the hour, and you are not waiting on a partner's schedule to
            line up with yours. You leave with a rubric covering communication, problem solving, and
            code quality, the same rubric every time.
          </p>
          <p>
            The free plan includes 8 full sessions a month with complete AI feedback, no card
            required. <Link href="/pricing">Pro</Link> adds 35 sessions a month, spaced repetition
            scheduling, and a personalized roadmap.
          </p>
        </>
      ),
    },
    {
      heading: "When to use which",
      content: (
        <>
          <p>
            If you want practice on both sides of an interview, or you like trading time with
            another engineer instead of paying for anything, Pramp is worth doing. If you want the
            same quality bar every time, on your own schedule, graded against a rubric instead of
            another learner's read on your code, that is what CodeSparring is built for.
          </p>
          <p>
            Plenty of people use both: Pramp for the peer-swap experience, CodeSparring for
            consistent, scored reps in between.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Is CodeSparring free like Pramp?",
      answer:
        "The free plan includes 8 full interview sessions a month with complete AI feedback, no card required. Pro exists for people who want 35 sessions a month plus spaced repetition and a personalized roadmap.",
    },
    {
      question: "Does the AI grade communication the way a peer would?",
      answer:
        "Yes. Every session is scored on communication, problem solving, and code quality, including whether you asked clarifying questions and explained your approach as you worked, not just whether the final code passed.",
    },
    {
      question: "Do I need to schedule a session in advance?",
      answer:
        "No. CodeSparring is on demand, so you can start a session whenever you have time instead of coordinating a time slot with a partner.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs Pramp"
      subtitle="Comparison"
      heroDescription="Pramp pairs you with another engineer for a peer-to-peer mock interview, split evenly between candidate and interviewer. CodeSparring pairs you with an AI interviewer instead, so every minute goes to your round."
      primaryKeyword="peer-to-peer mock interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
