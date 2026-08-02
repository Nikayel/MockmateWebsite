import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"
import { trackPath } from "@/lib/tutorials/lesson-routes"

export const metadata: Metadata = {
  title: "System Design Interview Practice",
  description:
    "Practice system design interviews with an AI interviewer. Master scalability, trade-offs, and architecture for FAANG senior engineering rounds.",
  alternates: {
    canonical: "/system-design-interview-practice",
  },
}

export default function SystemDesignInterviewPracticePage() {
  const contentSections = [
    {
      heading: "Why System Design Interviews are Different",
      content: (
        <>
          <p>
            Unlike coding rounds that have a definitive right or wrong answer, system design
            interviews are open-ended discussions. They test your ability to navigate ambiguity,
            weigh architectural trade-offs, and design systems that scale.
          </p>
          <p>
            Because of this ambiguity, practicing alone is incredibly difficult. Reading "Designing
            Data-Intensive Applications" is great, but it doesn't prepare you for an interviewer
            asking, "What happens if our database node goes down?" midway through your explanation.
          </p>
          <p>
            If the concepts themselves are still shaky, start with our free{" "}
            <Link href={trackPath("system-design")}>System Design course</Link>. It takes one
            building block at a time, from load balancers to consistency models, and makes you write
            your own answer before it shows you a model one.
          </p>
        </>
      ),
    },
    {
      heading: "Simulating the Design Discussion",
      content: (
        <>
          <p>
            Our AI interviewer is trained on real-world system design rubrics. When you practice a
            scenario like "Design Twitter" or "Design a Rate Limiter," the AI will:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Ask you to clarify functional and non-functional requirements.</li>
            <li>Prompt you to perform back-of-the-envelope capacity estimations.</li>
            <li>Challenge your choice of database (SQL vs NoSQL) or caching strategy.</li>
            <li>
              Inject artificial constraints (e.g., "Assume we have a 10x spike in traffic during the
              Super Bowl").
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: "Mastering Trade-offs and Bottlenecks",
      content: (
        <>
          <p>
            Senior engineers aren't expected to design perfect systems; they are expected to design
            systems that make the right compromises for the product's needs.
          </p>
          <p>
            CodeSparring grades your performance specifically on your ability to articulate
            trade-offs (e.g., Consistency vs Availability in CAP theorem) and your ability to
            identify and resolve single points of failure (SPOFs) and bottlenecks.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Can I draw diagrams during the mock interview?",
      answer:
        "Currently, CodeSparring focuses on verbal and text-based architectural descriptions, simulating the conversational aspect of system design. We recommend using a physical whiteboard while talking to the AI to practice the full experience.",
    },
    {
      question: "Are system design interviews only for senior engineers?",
      answer:
        "While they are heavily weighted for Senior (L5+) roles, many companies are starting to ask simplified system design questions to Mid-level (L4) and even New Grad engineers to test their fundamental understanding of web architecture.",
    },
    {
      question: "What topics should I know before practicing?",
      answer:
        "You should be familiar with load balancing, caching strategies, database sharding/replication, message queues (Kafka/RabbitMQ), and microservices vs monolith architectures.",
    },
  ]

  return (
    <LandingPageTemplate
      title="System Design Interview Practice"
      subtitle="Architect at Scale"
      heroDescription="Navigate ambiguity and master architectural trade-offs. Practice open-ended system design discussions with an AI that challenges your design choices and tests your scalability knowledge."
      primaryKeyword="system design interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
