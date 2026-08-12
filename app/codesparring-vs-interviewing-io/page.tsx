import { Metadata } from "next"
import Link from "next/link"
import { PRICING_CONFIG } from "@/lib/config"
import {
  COMPETITOR_PRICING,
  MOCKS_FOR_IMPACT,
  getHumanMockTotalCost,
} from "@/lib/pricing-comparison"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs interviewing.io | AI vs Human Mock Interviews",
  description:
    "Compare CodeSparring and interviewing.io: AI mock interviews against real engineers, and what each costs per session.",
  alternates: {
    canonical: "/codesparring-vs-interviewing-io",
  },
}

export default function VsInterviewingIoPage() {
  const humanMockRange = getHumanMockTotalCost()

  const contentSections = [
    {
      heading: "What interviewing.io does well",
      content: (
        <p>
          interviewing.io pairs you with a real engineer for an anonymous mock interview. Practicing
          with someone who has actually sat on the other side of the table is worth something no
          simulation fully replaces: they can riff on your answer and react in ways that are hard to
          predict.
        </p>
      ),
    },
    {
      heading: "Cost and how often you can practice",
      content: (
        <>
          <p>
            {`A single session on interviewing.io runs $${COMPETITOR_PRICING.humanMock.perSessionMin} to $${COMPETITOR_PRICING.humanMock.perSessionMax}. ${MOCKS_FOR_IMPACT} of them run $${humanMockRange.min} to $${humanMockRange.max}, which adds up fast if you want more than a session or two before the real thing.`}
          </p>
          <p>
            {`CodeSparring's Pro plan costs ${PRICING_CONFIG.pro.website.monthly.priceDisplay} a month, or ${PRICING_CONFIG.pro.website.yearly.totalDisplay} billed yearly, and includes ${PRICING_CONFIG.pro.sessionsPerMonth} AI interview sessions a month. That is enough sessions to make a mistake, fix it, and try again, without rationing every attempt.`}
          </p>
        </>
      ),
    },
    {
      heading: "When to use which",
      content: (
        <>
          <p>
            If you can afford a session or two on interviewing.io before an onsite, it is a strong
            way to get a read from someone who has been on the other side of a real loop. If what
            you need most is volume, practicing often enough that the format stops feeling new, that
            is where CodeSparring's <Link href="/pricing">session count</Link> earns its keep.
          </p>
          <p>
            Plenty of candidates do both: CodeSparring for the bulk of the practice, then
            interviewing.io for a session close to the real thing.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Does the AI give feedback as good as a human's?",
      answer:
        "The AI grades every session against the same rubric: communication, problem solving, and code quality. It is consistent, and it tends to catch time-complexity issues and edge cases reliably. A human interviewer offers something different: real stories from their own loop and a read on how you come across in the room.",
    },
    {
      question: "Is the AI voice-enabled?",
      answer:
        "Yes. Sessions run by voice or text, so the back-and-forth feels close to a real phone screen or video call.",
    },
    {
      question: "Can I use both?",
      answer:
        "Yes. Many candidates use CodeSparring for volume and interviewing.io for a final check before the real thing.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs interviewing.io"
      subtitle="Comparison"
      heroDescription="interviewing.io pairs you with a real engineer for an anonymous mock interview. CodeSparring pairs you with an AI interviewer you can run as often as you want, for a lot less per session."
      primaryKeyword="mock interview platform"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
