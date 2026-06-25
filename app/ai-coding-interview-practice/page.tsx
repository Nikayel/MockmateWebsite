import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "AI Coding Interview Practice Simulator | CodeSparring",
  description:
    "Master coding interviews with an AI interviewer. Practice data structures, algorithms, and real-world coding problems with instant, actionable feedback.",
}

export default function AICodingInterviewPracticePage() {
  const contentSections = [
    {
      heading: "Why Practice Coding Interviews with AI?",
      content: (
        <>
          <p>
            Passing a coding interview isn't just about solving the problem—it's about how you
            communicate your thought process. While platforms like LeetCode test your ability to
            pass test cases, they don't prepare you for the pressure of a real human interviewer
            asking follow-up questions or asking you to optimize your code.
          </p>
          <p>
            An AI coding interview simulator bridges this gap. It listens to you explain your
            approach, provides hints if you get stuck, and grades you on the same rubric used by
            FAANG companies: problem-solving, coding ability, communication, and verification.
          </p>
        </>
      ),
    },
    {
      heading: "Mastering the 15 Core DSA Patterns",
      content: (
        <>
          <p>
            You don't need to memorize 1,000 LeetCode problems to pass an interview. You need to
            deeply understand the underlying patterns. CodeSparring's AI mock interviews are
            structured around the 15 core patterns that cover 90% of technical interview questions,
            including:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Two Pointers & Sliding Window:</strong> Essential for array and string
              manipulation.
            </li>
            <li>
              <strong>Breadth-First & Depth-First Search:</strong> The backbone of tree and graph
              problems.
            </li>
            <li>
              <strong>Dynamic Programming:</strong> Mastering overlapping subproblems and optimal
              substructure.
            </li>
            <li>
              <strong>Top K Elements & Merge Intervals:</strong> Advanced heap and sorting
              techniques.
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "Actionable Feedback on Your Performance",
      content: (
        <>
          <p>
            After every practice round, our AI analyzes your performance across multiple dimensions.
            Did you jump straight into coding without clarifying the constraints? Did you use an
            O(N^2) approach when an O(N) solution existed? Was your variable naming clear?
          </p>
          <p>
            You receive a comprehensive scorecard highlighting exactly what went well and what needs
            improvement, along with a spaced-repetition plan to ensure you don't forget the concepts
            you struggled with.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "How does an AI mock interview compare to a human mock interview?",
      answer:
        "Human mock interviews (like Pramp or Interviewing.io) are incredibly valuable, but they are expensive and difficult to schedule. Our AI simulator provides 80% of the value of a human interviewer (dynamic feedback, voice interaction, realistic pressure) at a fraction of the cost, available 24/7.",
    },
    {
      question: "Can I use voice to talk to the AI?",
      answer:
        "Yes! CodeSparring features low-latency voice integration. You can talk through your solution out loud, and the AI will respond to your ideas in real-time, exactly like a real interviewer.",
    },
    {
      question: "Are the questions similar to LeetCode?",
      answer:
        "Our question bank covers the same fundamental data structures and algorithms as LeetCode, but our scenarios are specifically designed to be conversational. They test your ability to gather requirements and handle shifting constraints.",
    },
  ]

  return (
    <LandingPageTemplate
      title="AI Coding Interview Practice"
      subtitle="Master the Technical Screen"
      heroDescription="Stop grinding test cases in silence. Practice with an AI interviewer that listens to your approach, gives hints when you're stuck, and grades your communication and code efficiency."
      primaryKeyword="coding interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
