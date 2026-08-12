import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "How to Talk Through Coding Interviews",
  description:
    "How to narrate your thinking in a coding interview: clarify the question, say the brute force out loud, then talk through your fix before you type.",
  alternates: {
    canonical: "/guides/how-to-talk-through-coding-interviews",
  },
}

export default function TalkThroughGuidePage() {
  const contentSections = [
    {
      heading: "The silent failure",
      content: (
        <>
          <p>
            The most common failure in a technical interview is not a wrong answer. It is reading
            the prompt, saying "okay, I think I know how to do this," and then going quiet for 20
            minutes while you type.
          </p>
          <p>
            Working code delivered in silence still costs you the interview. The interviewer is not
            only checking your output. They are watching how you think, and silence gives them
            nothing to evaluate. If you cannot narrate a decision, they have to guess whether you
            understood the problem or got lucky.
          </p>
        </>
      ),
    },
    {
      heading: "A framework for narrating your thinking",
      content: (
        <>
          <p>Use the same sequence every time so it becomes automatic under pressure.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-6">
            <li>
              <strong>Clarify first.</strong> Repeat the question in your own words and ask about
              constraints: can the array be empty, can numbers be negative, is the input sorted.
            </li>
            <li>
              <strong>Say the brute force out loud.</strong> Describe the naive approach, even at
              O(n^2), before you touch the optimal one. It proves you understood the problem and
              buys you time to think.
            </li>
            <li>
              <strong>Propose the optimization, then check in.</strong> "I think a hash map gets
              this to O(n). Does that sound right to you?" Wait for a response before you start
              typing.
            </li>
            <li>
              <strong>Narrate as you type.</strong> "This loop builds the frequency count, this one
              checks it." A few words per line is enough. Total silence is the only wrong amount.
            </li>
          </ol>
        </>
      ),
    },
    {
      heading: "Practicing this before it counts",
      content: (
        <>
          <p>
            Solving problems alone does not train this, because nothing you say gets evaluated. You
            need something that reacts to what you say and follows up when you skip a step.
          </p>
          <p>
            CodeSparring's AI interviewer follows your code as you write it and asks about the
            choices you make, in voice or text. Sessions are scored on communication alongside
            problem solving and code quality, so going quiet costs you even when the code ends up
            correct. See what a scored session looks like in the{" "}
            <Link href="/samples">sample sessions</Link>.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "What if I get stuck while talking?",
      answer:
        "Say so directly: 'I need a minute to think through this edge case.' Declared silence reads as control. Undeclared silence is what makes interviewers nervous.",
    },
    {
      question: "Do I need to narrate every single line?",
      answer:
        "No. Narrate decisions, not syntax. You do not need to say 'now I am writing a for loop.' You do need to say why you are reaching for a hash map before you write it.",
    },
    {
      question: "Is voice or text better for practicing this?",
      answer:
        "Voice forces you to actually produce the words instead of composing them silently in your head, which is closer to a real interview. Text is a reasonable place to start if you are not ready for that yet.",
    },
  ]

  return (
    <LandingPageTemplate
      title="How to talk through coding interviews"
      subtitle="Guide"
      heroDescription="Working code is not enough if you solve it in silence. Here is what to say, and when, from your first read of the prompt to the last line you type."
      primaryKeyword="talk through coding interviews"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
