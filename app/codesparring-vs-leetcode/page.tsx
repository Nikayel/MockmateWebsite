import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs LeetCode: Which is Better for Interview Prep?",
  description:
    "Compare CodeSparring and LeetCode for technical interview prep. See why practicing communication with an AI beats silently passing test cases.",
}

export default function VsLeetCodePage() {
  const contentSections = [
    {
      heading: "The LeetCode Trap",
      content: (
        <>
          <p>
            LeetCode is the gold standard for learning Data Structures and Algorithms. However, it
            creates a false sense of security. Many engineers can solve 300+ LeetCode problems but
            still fail real interviews. Why? Because LeetCode tests your ability to write code that
            passes edge cases in a vacuum.
          </p>
          <p>
            Real interviews test your ability to <strong>communicate</strong> your thought process,
            clarify requirements, handle hints, and discuss Big O complexity under pressure. If you
            grind LeetCode in silence, you are missing 50% of the rubric.
          </p>
        </>
      ),
    },
    {
      heading: "How CodeSparring Fills the Gap",
      content: (
        <>
          <p>
            CodeSparring is designed to be the final step after you've learned the basics. Instead
            of an empty text box with a "Run" button, you get an interactive AI interviewer.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Voice Interaction:</strong> Talk through your solution out loud before coding.
            </li>
            <li>
              <strong>Dynamic Constraints:</strong> Just like a real interviewer, the AI will change
              requirements mid-interview to see how you adapt.
            </li>
            <li>
              <strong>Holistic Scoring:</strong> Get graded on your communication, problem-solving,
              code efficiency, and verification skills—not just whether your code compiles.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "When to use which?",
      content: (
        <>
          <p>
            <strong>Use LeetCode to learn the patterns.</strong> If you don't know what a hash map
            or a sliding window is, LeetCode's discussion forums and raw volume of questions are
            unbeatable.
          </p>
          <p>
            <strong>Use CodeSparring to prepare for the interview.</strong> Once you know the
            patterns, use CodeSparring to practice the soft skills, timing, and pressure of a real
            technical screen.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Does CodeSparring have LeetCode-style questions?",
      answer:
        "Yes, our question bank covers the same 15 core patterns (Arrays, DP, Graphs, etc.) but structures them as conversational scenarios rather than isolated algorithmic puzzles.",
    },
    {
      question: "Can I use both?",
      answer:
        "Absolutely! The best candidates use LeetCode for repetition and CodeSparring for mock interviews.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs LeetCode"
      subtitle="Beyond Passing Test Cases"
      heroDescription="LeetCode teaches you the algorithms. CodeSparring teaches you how to pass the interview. Compare the two platforms and learn why communication matters."
      primaryKeyword="interview simulator"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
