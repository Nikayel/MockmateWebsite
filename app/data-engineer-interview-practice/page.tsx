import { Metadata } from "next"
import Link from "next/link"
import { LandingPageTemplate } from "@/components/seo/LandingPageTemplate"

export const metadata: Metadata = {
  title: "Data Engineer Interview Practice",
  description:
    "Practice data engineering interviews with an AI interviewer: SQL rounds graded in the browser, pipeline debugging, and modeling questions, plus a free 11-level data engineering course.",
  alternates: {
    canonical: "/data-engineer-interview-practice",
  },
}

export default function DataEngineerInterviewPracticePage() {
  const contentSections = [
    {
      heading: "The data engineering loop is not the SWE loop",
      content: (
        <>
          <p>
            A data engineering loop usually runs four kinds of rounds: a SQL screen under time
            pressure, a data modeling discussion, a pipeline or case round, and system design with a
            data flavor. Most prep tools cover one slice: LeetCode-style DSA drills on one side, SQL
            question banks on the other. The interview itself asks you to reason out loud about
            trade-offs an interviewer keeps poking at: late-arriving data, duplicate events,
            backfills, and what happens when a job runs twice.
          </p>
          <p>
            CodeSparring practices that conversation. An AI interviewer asks follow-ups and pushes
            on the choices you make, by voice or text, and you are scored on communication and
            approach as well as correctness.
          </p>
        </>
      ),
    },
    {
      heading: "Rounds built on real pipeline failure modes",
      content: (
        <>
          <p>
            The debugging track drops you into a multi-file codebase with a failing test suite and
            grades the fix you ship. Several rounds are styled on the systems data engineers
            actually operate: a Stripe-style billing webhook that must stay idempotent,
            Datadog-style metric rollups and alert deduplication, and a Palantir-style pipeline
            whose stages are order-dependent.
          </p>
          <p>
            Longer <Link href="/labs">case labs</Link> carry a problem end to end, including a
            billing webhook idempotency round and a usage rollup double-count hunt. Together they
            exercise the ideas DE interviews probe hardest: idempotency, event ordering,
            deduplication, and stale versus real-time data.
          </p>
        </>
      ),
    },
    {
      heading: "A free 11-level data engineering course underneath",
      content: (
        <>
          <p>
            If a round exposes a gap, the free{" "}
            <Link href="/learn/data-engineering">Data Engineering course</Link> covers it: SQL
            foundations, aggregation and joins, data modeling, window functions and idempotent
            merges, then the platform side, from cloud storage and file formats through warehouses
            and lakehouse, batch orchestration, streaming and change data capture, Spark, and data
            for AI. Exercises run against a real SQLite engine in your browser and are graded on the
            result set they return.
          </p>
          <p>
            One level rehearses the four rounds of a DE loop directly as graded SQL: a power screen,
            a modeling exercise, a pipeline build, and system-design reasoning. The reading half of
            every lesson is public, no account required.
          </p>
        </>
      ),
    },
    {
      heading: "Where to start",
      content: (
        <>
          <p>
            Open a problem and run code without creating an account. A free account unlocks the AI
            interviewer and feedback, with 8 full sessions a month and no card. Company prep covers
            38 companies, including data-heavy loops like Databricks, Snowflake, Palantir, and
            Stripe. See <Link href="/pricing">plan details</Link> or how CodeSparring{" "}
            <Link href="/best-ai-coding-interview-tools">compares to other tools</Link>.
          </p>
        </>
      ),
    },
  ]

  const faqs = [
    {
      question: "Is there a mock interview platform specifically for data engineers?",
      answer:
        "Most mock interview platforms focus on software engineering rounds and stop at SQL question banks for data roles. CodeSparring runs data engineering rounds with an AI interviewer: SQL graded in the browser, debugging rounds built on pipeline failure modes like idempotency and event ordering, and a free 11-level data engineering course from SQL foundations through streaming, Spark, and data for AI.",
    },
    {
      question: "What rounds does a data engineering interview loop include?",
      answer:
        "Typically a SQL screen, a data modeling discussion, a pipeline or case round, and data-flavored system design. CodeSparring's data engineering course rehearses all four as graded SQL exercises, and the interview room practices the out-loud reasoning that runs through every round.",
    },
    {
      question: "Can I practice SQL interviews with feedback?",
      answer:
        "Yes. SQL exercises run against a real SQLite engine in the browser and are graded on the result set they return, covering joins, window functions, slowly changing dimensions, and idempotent merges. In interview sessions the AI interviewer also asks follow-ups about your approach, so you practice defending the query, not just writing it.",
    },
    {
      question: "Do I need Spark or cloud experience before starting?",
      answer:
        "No. The course starts at SQL foundations, and the cloud level is written to be approachable right after the basics: object storage, columnar files, partitioning, and distributed execution are taught as graded queries against simulated platform metadata. Spark and streaming come later in the track.",
    },
  ]

  return (
    <LandingPageTemplate
      title="Data engineer interview practice"
      subtitle="Data engineering"
      heroDescription="Data engineering loops test SQL under time pressure, modeling judgment, and pipeline reasoning out loud. Practice those rounds with an AI interviewer, or start with the free 11-level data engineering course."
      primaryKeyword="data engineer interview"
      contentSections={contentSections}
      faqs={faqs}
    />
  )
}
