"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  XCircle,
  Code,
  MessageSquare,
  BarChart3,
  Download,
  RotateCcw,
  Plus,
  ArrowLeft,
  Target,
  Lightbulb,
  AlertTriangle,
  BookOpen,
} from "lucide-react"
import Link from "next/link"

export default function DynamicProgrammingNeedsWorkPage() {
  return (
    <main className="bg-background min-h-screen">
      <Header />

      {/* Header Section */}
      <section className="from-background via-card to-background bg-gradient-to-br pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/samples"
              className="text-accent-strong hover:text-accent-strong/80 mb-6 inline-flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Samples
            </Link>

            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center space-x-4">
                  <Badge className="border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400">
                    Hard
                  </Badge>
                  <Badge className="bg-accent/20 text-accent-strong border-accent/30">
                    Completed
                  </Badge>
                </div>
                <h1 className="font-heading text-foreground text-4xl font-bold">
                  Longest Increasing Subsequence
                </h1>
                <p className="text-muted-foreground mt-2">
                  Dynamic programming optimization problem
                </p>
              </div>
              <div className="text-right">
                <div className="mb-1 text-4xl font-bold text-red-600 dark:text-red-400">C</div>
                <div className="text-muted-foreground">Overall Grade</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Summary */}
      <section className="from-card to-background bg-gradient-to-b py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <Card className="bg-card/50 border-border glass-effect mb-8">
              <CardHeader>
                <CardTitle className="text-foreground text-2xl">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Time Taken</div>
                      <div className="text-foreground text-xl font-semibold">45 minutes</div>
                    </div>
                    <Clock className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>

                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Complexity Accuracy</div>
                      <div className="text-foreground text-xl font-semibold">Poor</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>

                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Edge Cases Discussed</div>
                      <div className="text-foreground text-xl font-semibold">No</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>

                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Alternative Solutions</div>
                      <div className="text-foreground text-xl font-semibold">No</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Code Solution */}
              <Card className="bg-card/50 border-border glass-effect">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center space-x-2">
                    <Code className="text-accent-strong h-5 w-5" />
                    <span>Your Solution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-lg p-4">
                    <pre className="text-foreground font-mono text-sm leading-relaxed">
                      <code>{`function lengthOfLIS(nums) {
    let maxLength = 1;
    
    for (let i = 0; i < nums.length; i++) {
        let currentLength = 1;
        let lastNum = nums[i];
        
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[j] > lastNum) {
                currentLength++;
                lastNum = nums[j];
            }
        }
        
        maxLength = Math.max(maxLength, currentLength);
    }
    
    return maxLength;
}`}</code>
                    </pre>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Incorrect algorithm - greedy approach
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        O(n²) time complexity, not optimal
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-yellow-400" />
                      <span className="text-sm text-amber-700 dark:text-yellow-400">
                        Misses optimal substructure
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Feedback */}
              <Card className="bg-card/50 border-border glass-effect">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center space-x-2">
                    <MessageSquare className="text-accent-strong h-5 w-5" />
                    <span>AI Feedback</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        Critical Issues
                      </span>
                    </div>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>• Used greedy approach instead of dynamic programming</li>
                      <li>• Algorithm produces incorrect results for many inputs</li>
                      <li>• Missed the optimal substructure property</li>
                      <li>• No consideration of overlapping subproblems</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <Target className="h-4 w-4 text-amber-700 dark:text-yellow-400" />
                      <span className="font-semibold text-amber-700 dark:text-yellow-400">
                        What You Missed
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      This is a classic DP problem. The key insight is that for each position, you
                      need to consider all previous elements that are smaller and build upon their
                      LIS lengths.
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        Study Recommendations
                      </span>
                    </div>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>• Review dynamic programming fundamentals</li>
                      <li>• Practice identifying optimal substructure</li>
                      <li>• Study the O(n log n) binary search solution</li>
                      <li>• Work through more DP problems step by step</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Correct Solution */}
            <Card className="bg-card/50 border-border glass-effect mt-8">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <Lightbulb className="text-accent-strong h-5 w-5" />
                  <span>Correct DP Solution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-background rounded-lg p-4">
                  <pre className="text-foreground font-mono text-sm leading-relaxed">
                    <code>{`function lengthOfLIS(nums) {
    if (nums.length === 0) return 0;
    
    const dp = new Array(nums.length).fill(1);
    
    for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
    }
    
    return Math.max(...dp);
}`}</code>
                  </pre>
                </div>
                <div className="text-muted-foreground mt-4 text-sm">
                  <p>
                    <strong>Key insight:</strong> dp[i] represents the length of the longest
                    increasing subsequence ending at index i. For each position, we check all
                    previous positions and extend their LIS if the current element is larger.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="bg-card/50 border-border glass-effect mt-8">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <BarChart3 className="text-accent-strong h-5 w-5" />
                  <span>Detailed Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Problem Understanding</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">45%</span>
                    </div>
                    <Progress value={45} className="bg-muted h-2" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Code Quality</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">35%</span>
                    </div>
                    <Progress value={35} className="bg-muted h-2" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Communication</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">55%</span>
                    </div>
                    <Progress value={55} className="bg-muted h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-card/50 border-border glass-effect mt-8">
              <CardHeader>
                <CardTitle className="text-foreground">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report (JSON)
                  </Button>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry Session
                  </Button>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1">
                    <Plus className="mr-2 h-4 w-4" />
                    New Problem
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
