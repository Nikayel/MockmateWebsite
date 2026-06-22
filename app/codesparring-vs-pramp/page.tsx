import { Metadata } from "next"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "CodeSparring vs Pramp | Mock Interview Comparison",
  description:
    "Compare CodeSparring to Pramp. Find out why practicing with an AI interviewer is often more effective than peer-to-peer mock interviews.",
}

export default function VsPrampPage() {
  const contentSections = [
    {
      heading: "Peer-to-Peer vs AI Interviews",
      content: (
        <>
          <p>
            Pramp is a popular platform that pairs you with another engineer for a peer-to-peer mock
            interview. You spend 30 minutes interviewing them, and they spend 30 minutes
            interviewing you. It's free and a great way to start practicing speaking out loud.
          </p>
          <p>
            CodeSparring replaces the peer with an advanced AI. Instead of splitting your time
            50/50, you spend 100% of your time being interviewed.
          </p>
        </>
      ),
    },
    {
      heading: "The Quality Control Problem",
      content: (
        <>
          <p>
            The main challenge with peer-to-peer platforms like Pramp is quality control. Your
            experience entirely depends on the skill level of the random peer you match with.
            Sometimes you get a great partner; often, you get someone who doesn't understand the
            problem they are supposed to be interviewing you on, resulting in poor feedback.
          </p>
          <p>
            CodeSparring's AI provides a consistent, high-bar experience every single time. The AI
            deeply understands the optimal solution, the time complexity, and exactly what hints to
            give you to keep you moving without giving away the answer.
          </p>
        </>
      ),
    },
    {
      heading: "Scheduling and Flexibility",
      content: (
        <>
          <p>
            Pramp requires scheduling a time slot and committing to a full hour (since you have to
            interview the other person). CodeSparring is entirely on-demand. Have 20 minutes before
            work? You can spin up an AI interview instantly, pause it if needed, and review your
            feedback immediately.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Is CodeSparring free like Pramp?",
      answer:
        "CodeSparring offers free practice rounds so you can experience the AI, along with premium tiers for unlimited access and advanced real-world scenarios.",
    },
    {
      question: "Will the AI actually judge my communication skills?",
      answer:
        "Yes! Our platform explicitly grades you on communication—whether you asked clarifying questions, stated your assumptions, and explained your code clearly while typing.",
    },
  ]

  return (
    <LandingPageTemplate
      title="CodeSparring vs Pramp"
      subtitle="Consistent, On-Demand Practice"
      heroDescription="Pramp is great for peer-to-peer practice, but the quality is hit-or-miss. Discover why thousands of engineers are switching to AI mock interviews for consistent, high-quality feedback."
      primaryKeyword="peer-to-peer mock interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
