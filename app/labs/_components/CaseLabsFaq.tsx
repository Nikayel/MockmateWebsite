/**
 * Common questions on `/labs`.
 *
 * ## Collapsed in CSS, present in the DOM
 *
 * Native `<details>`, server rendered, no JavaScript. Every answer ships in the initial HTML and is
 * hidden by the element's own styling rather than by conditional rendering, which is the difference
 * between a crawler seeing collapsed content (fine) and seeing no content at all (not fine). It also
 * means the disclosure works with JS off and gets keyboard operation and correct announcement for
 * free, which a hand-rolled button-plus-state version has to reimplement and usually gets wrong.
 *
 * ## Where these came from
 *
 * Two are new and high intent: they are the questions a candidate types into a search box in the
 * week before the loop. Three are recycled from prose boxes that used to sit in the middle of the
 * page ("Practice mode and Onsite mode", "Do you need an account?", and the milestone-freedom claim)
 * where they were paragraphs nobody asked for. Same words, now attached to the question they answer.
 *
 * ## The schema
 *
 * `FAQPage` JSON-LD is emitted from the SAME array the page renders, so the two cannot drift.
 *
 * Honest scope note: Google stopped rendering FAQ rich results on 2026-05-07, which is why
 * `FAQPageJsonLd` was deleted from `components/seo/JsonLd.tsx`. This is emitted anyway for the same
 * reason `HomepagePositioningFAQJsonLd` was deliberately kept: an answer engine reading this page
 * gets a clean question-to-answer mapping for "how do I prepare for a Palantir FDSE interview",
 * which is a separate purpose from a blue-link rich result and one this site actively courts (see
 * `public/llms.txt` and the AI-crawler allowances in `app/robots.ts`). Expect no SERP treatment.
 */

import { ChevronDown } from "lucide-react"

interface FaqEntry {
  question: string
  /** One entry per rendered paragraph. Joined for the schema's single `text` field. */
  answer: string[]
}

const FAQS: FaqEntry[] = [
  {
    question: "How do I prepare for a Palantir FDSE interview?",
    answer: [
      "Prepare the rounds separately, because they score different things. The forward-deployed loop runs a decomposition round on a vague operational problem, a re-engineering round on a few hundred lines you did not write with a plausible red herring planted in them, and a learning round on an unfamiliar API documented only by its docstrings. There is also a timed assessment before the onsite.",
      "The three Palantir labs here take one of those rounds each: 911 Dispatch Optimization is the decomposition round, Usage Rollup Double-Count is the re-engineering round, and Ontology Learning Round is the learning round. Each one names the parts of the loop it does not cover, so you can see what is left.",
    ],
  },
  {
    question:
      "What is the difference between a decomposition interview and a system design interview?",
    answer: [
      "A system design interview asks you to size and shape a system you will never build, and it ends at the diagram. A decomposition interview ends in running code: you scope the ambiguity, commit to a contract, then open an existing multi-file repository and change it until the tests pass.",
      "The overlap is real, which is why both reward naming entities and defending tradeoffs. The difference is what is on the table at the end. A design round scores the architecture you can argue for. A decomposition round scores the ambiguity you resolved and the code that came out of it.",
    ],
  },
  {
    question: "What is the difference between Practice mode and Onsite mode?",
    answer: [
      "You pick a mode before the lab starts. Practice is open and hint friendly. Onsite runs interview conditions: a clock against the lab's estimated time, and a curveball dropped into the Build milestone once your tests have run, which changes a constraint and asks whether your design survives it.",
    ],
  },
  {
    question: "Do I need an account to use a case lab?",
    answer: [
      "No. You can open a lab and work through it without one, including the Build milestone and the test suite, which run in your browser. Signing in is what saves the run so you can come back to it, and the interviewer chat and the written review are AI backed, so those need an account.",
    ],
  },
  {
    question: "Can I move between milestones freely?",
    answer: [
      "Yes. The five milestones always run in the same order, but nothing is locked and nothing is hidden until you have earned it. You can jump ahead to Build, run the tests, and come back to Clarify when the code tells you something the brief did not.",
    ],
  },
]

function FaqJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer.join(" ") },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function CaseLabsFaq() {
  return (
    <section aria-labelledby="common-questions" className="flex flex-col gap-4">
      <FaqJsonLd />
      <h2 id="common-questions" className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl">
        Common questions
      </h2>
      <div className="flex flex-col gap-2">
        {FAQS.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-lg border border-[var(--wb-border)] bg-[var(--wb-card)] transition-colors open:border-[var(--wb-accent)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-semibold text-[var(--wb-text)]">{faq.question}</h3>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-[var(--wb-text-secondary)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <div className="flex flex-col gap-2 px-3 pb-3">
              {faq.answer.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
