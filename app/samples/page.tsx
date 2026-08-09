"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

const sampleSessions = [
  {
    id: "two-sum-excellent",
    title: "Two Sum - Excellent Performance",
    difficulty: "Easy",
    grade: "A+",
    timeSpent: "8 minutes",
    status: "excellent",
    description: "Optimal hash map solution with perfect time complexity analysis",
  },
  {
    id: "binary-tree-good",
    title: "Binary Tree Traversal - Good Performance",
    difficulty: "Medium",
    grade: "B+",
    timeSpent: "25 minutes",
    status: "good",
    description: "Recursive solution with minor optimization opportunities",
  },
  {
    id: "dynamic-programming-needs-work",
    title: "Dynamic Programming - Needs Improvement",
    difficulty: "Hard",
    grade: "C",
    timeSpent: "45 minutes",
    status: "needs-work",
    description: "Brute force approach, missed optimal substructure",
  },
]

export default function SamplesPage() {
  return (
    <main className="bg-background min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="from-background via-secondary to-background bg-gradient-to-br pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="bg-accent/20 text-accent-strong border-accent/30 mb-6">
              Sample Feedback Reports
            </Badge>
            <h1 className="font-heading text-foreground mb-6 text-4xl font-bold md:text-6xl">
              Real Interview
              <span className="text-gradient"> Feedback Examples</span>
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl">
              Explore detailed feedback reports from actual CodeSparring interview sessions. See how
              our AI analyzes performance, identifies improvement areas, and provides actionable
              insights.
            </p>
          </div>
        </div>
      </section>

      {/* Sample Sessions Grid */}
      <section className="from-card to-background bg-gradient-to-b py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-heading text-foreground mb-12 text-center text-3xl font-bold">
              Browse Sample Sessions
            </h2>

            <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {sampleSessions.map((session) => (
                <Card
                  key={session.id}
                  className="bg-card/50 border-border glass-effect hover:border-accent/50 transition-all duration-300"
                >
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        className={`${
                          session.difficulty === "Easy"
                            ? "text-neural border-green-500/30 bg-green-500/20"
                            : session.difficulty === "Medium"
                              ? "border-yellow-500/30 bg-yellow-500/20 text-amber-700 dark:text-yellow-400"
                              : "border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {session.difficulty}
                      </Badge>
                      <div
                        className={`text-2xl font-bold ${
                          session.status === "excellent"
                            ? "text-neural"
                            : session.status === "good"
                              ? "text-amber-700 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {session.grade}
                      </div>
                    </div>
                    <CardTitle className="text-foreground text-lg">{session.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">{session.description}</p>

                    <div className="text-muted-foreground flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{session.timeSpent}</span>
                    </div>

                    <Link href={`/samples/${session.id}`}>
                      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full">
                        View Full Report
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-foreground mb-6 text-3xl font-bold">
            Ready to Get Your Own Detailed Feedback?
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
            Start practicing with CodeSparring and receive comprehensive performance analytics for
            your coding interviews.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/interview">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 text-lg"
              >
                Start Practicing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-muted bg-transparent px-8 py-4 text-lg"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
