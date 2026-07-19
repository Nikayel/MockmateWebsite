import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "How to Talk Through Coding Interviews",
  description:
    "Learn how to communicate effectively during a software engineering interview. Stop coding in silence and start articulating your thought process.",
  alternates: {
    canonical: "/guides/how-to-talk-through-coding-interviews",
  },
}

export default function TalkThroughGuidePage() {
  const contentSections = [
    {
      heading: "The Silent Failure",
      content: (
        <>
          <p>
            The most common mistake candidates make during a technical interview is reading the
            prompt, saying "Okay, I think I know how to do this," and then silently typing for 20
            minutes.
          </p>
          <p>
            Even if you produce perfectly working code, you have failed the interview. Interviewers
            are not just evaluating your code; they are evaluating what it would be like to work
            with you on a team. If you can't communicate your technical decisions, you are a
            liability.
          </p>
        </>
      ),
    },
    {
      heading: "The 'Think Out Loud' Framework",
      content: (
        <>
          <p>
            To pass modern technical screens, you need to adopt a strict communication protocol:
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-6">
            <li>
              <strong>Clarify:</strong> Repeat the question back in your own words. Ask about
              constraints (e.g., "Can the array contain negative numbers?").
            </li>
            <li>
              <strong>Brute Force:</strong> Verbally describe the naive O(N^2) solution. This proves
              you have a baseline understanding and buys you time to think of an optimal approach.
            </li>
            <li>
              <strong>Optimize:</strong> Discuss how you might use a Hash Map or Two Pointers to
              bring the time complexity down to O(N). Ask the interviewer: "Does this approach sound
              good to you?" before you start typing.
            </li>
            <li>
              <strong>Narrate as You Type:</strong> "Now I'm creating the hash map to store the
              frequencies..." Keep a steady stream of consciousness.
            </li>
          </ol>
        </>
      ),
    },
    {
      heading: "Practicing Your Communication",
      content: (
        <>
          <p>
            You cannot practice this by staring at LeetCode. You have to physically open your mouth
            and speak.
          </p>
          <p>
            CodeSparring's AI simulator is specifically built to grade your communication. It uses
            voice-recognition to ensure you are narrating your steps and penalizes you if you spend
            too much time coding in silence.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "What if I get stuck while talking?",
      answer:
        "It is perfectly fine to say: 'I need a minute to think through this specific edge case.' Silence is okay if it is declared. Undeclared silence is what makes interviewers nervous.",
    },
  ]

  return (
    <LandingPageTemplate
      title="How to Talk Through Coding Interviews"
      subtitle="Communication is Key"
      heroDescription="Coding is only half the battle. Learn the frameworks and techniques to effectively communicate your thought process during technical interviews."
      primaryKeyword="talk through coding interviews"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
