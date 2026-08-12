import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "System Design Interview Practice",
  description:
    "Practice system design interviews with an AI interviewer, plus a free course covering the fundamentals, from load balancers to consistency models.",
  alternates: {
    canonical: "/system-design-interview-practice",
  },
}

export default function SystemDesignInterviewPracticePage() {
  const contentSections = [
    {
      heading: "Why system design interviews are different",
      content: (
        <>
          <p>
            A coding problem has a right answer. System design does not: it is an open-ended
            conversation about trade-offs, and about how you handle ambiguity when there is no
            single correct diagram. That is also what makes it hard to practice alone. A book can
            explain consistency models and load balancers. It will not ask a follow-up question when
            your answer leaves a gap.
          </p>
          <p>
            If the fundamentals are still shaky, start with the free{" "}
            <Link href="/learn/system-design">System Design course</Link>. It takes one building
            block at a time, from load balancers to consistency models, and has you write your own
            answer before it shows you a model one.
          </p>
        </>
      ),
    },
    {
      heading: "Practicing the conversation",
      content: (
        <>
          <p>
            System design rounds usually start with clarifying requirements: who uses the system,
            how much traffic, and what has to stay available versus what has to stay consistent.
            From there the conversation moves through rough estimation, component choices, and the
            trade-offs behind each one.
          </p>
          <p>
            CodeSparring&apos;s system design drills let you practice that conversation with an AI
            interviewer that probes the choices you make, by voice or text, instead of grading a
            static write-up.
          </p>
        </>
      ),
    },
    {
      heading: "What these rounds tend to cover",
      content: (
        <>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Clarifying functional and non-functional requirements before proposing anything.
            </li>
            <li>
              Rough capacity estimates: traffic, storage, and where the bottleneck is likely to be.
            </li>
            <li>
              Trade-offs between consistency and availability, and between database or caching
              choices.
            </li>
            <li>Single points of failure, and how the design degrades under load.</li>
          </ul>
          <p className="mt-4">
            These are general characteristics of system design interviews, not a fixed script. Every
            interviewer pushes on different parts.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Are system design interviews only for senior engineers?",
      answer:
        "They are weighted more heavily for senior roles, but simplified versions now show up for mid-level and even some new grad loops, usually scoped to a single API or a basic data model rather than a distributed system.",
    },
    {
      question: "Do I need to know the fundamentals before I start?",
      answer:
        "It helps. The free System Design course covers the building blocks, load balancers, caching, databases, consistency models, before you try a live discussion. You can also start directly if you want to see where the gaps are first.",
    },
    {
      question: "What should I read up on beforehand?",
      answer:
        "Load balancing, caching, database sharding and replication, message queues, and the trade-offs between a monolith and microservices come up often. None of it needs to be memorized perfectly. The interview tests how you reason through it, not whether you recite a definition.",
    },
  ]

  return (
    <LandingPageTemplate
      title="System design interview practice"
      subtitle="System design"
      heroDescription="System design interviews are open-ended: you weigh trade-offs and defend them as an interviewer pushes back. Practice that conversation with an AI interviewer, or start with the free course if the fundamentals are still shaky."
      primaryKeyword="system design interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
