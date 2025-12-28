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
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-background via-secondary to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30 mb-6">Sample Feedback Reports</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Real Interview
              <span className="text-gradient"> Feedback Examples</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Explore detailed feedback reports from actual CodeSparring interview sessions. See how our AI analyzes
              performance, identifies improvement areas, and provides actionable insights.
            </p>
          </div>
        </div>
      </section>

      {/* Sample Sessions Grid */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white mb-12 text-center">Browse Sample Sessions</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {sampleSessions.map((session) => (
                <Card
                  key={session.id}
                  className="bg-gray-900/50 border-gray-700 glass-effect hover:border-[#00d9ff]/50 transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={`${
                          session.difficulty === "Easy"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : session.difficulty === "Medium"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {session.difficulty}
                      </Badge>
                      <div
                        className={`text-2xl font-bold ${
                          session.status === "excellent"
                            ? "text-green-400"
                            : session.status === "good"
                              ? "text-yellow-400"
                              : "text-red-400"
                        }`}
                      >
                        {session.grade}
                      </div>
                    </div>
                    <CardTitle className="text-white text-lg">{session.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm">{session.description}</p>

                    <div className="flex items-center space-x-2 text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{session.timeSpent}</span>
                    </div>

                    <Link href={`/samples/${session.id}`}>
                      <Button className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
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
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-6">Ready to Get Your Own Detailed Feedback?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start practicing with CodeSparring and receive comprehensive performance analytics for your coding interviews.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/interview">
              <Button size="lg" className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white px-8 py-4 text-lg">
                Start Practicing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg bg-transparent"
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
