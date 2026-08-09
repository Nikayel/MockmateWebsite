"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  CheckCircle,
  Code,
  MessageSquare,
  BarChart3,
  Download,
  RotateCcw,
  Plus,
  ArrowLeft,
  TrendingUp,
  Lightbulb,
} from "lucide-react"
import Link from "next/link"

export default function TwoSumExcellentPage() {
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
                  <Badge className="bg-accent/20 text-accent-strong border-accent/30">Easy</Badge>
                  <Badge className="bg-accent/20 text-accent-strong border-accent/30">
                    Completed
                  </Badge>
                </div>
                <h1 className="font-heading text-foreground text-4xl font-bold">Two Sum Problem</h1>
                <p className="text-muted-foreground mt-2">
                  Array manipulation with hash map optimization
                </p>
              </div>
              <div className="text-right">
                <div className="text-accent-strong mb-1 text-4xl font-bold">A+</div>
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
                      <div className="text-foreground text-xl font-semibold">8 minutes</div>
                    </div>
                    <Clock className="text-accent-strong h-8 w-8" />
                  </div>

                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Complexity Accuracy</div>
                      <div className="text-foreground text-xl font-semibold">Perfect</div>
                    </div>
                    <CheckCircle className="text-accent-strong h-8 w-8" />
                  </div>

                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Edge Cases Discussed</div>
                      <div className="text-foreground text-xl font-semibold">Yes</div>
                    </div>
                    <CheckCircle className="text-accent-strong h-8 w-8" />
                  </div>

                  <div className="bg-background/50 flex items-center justify-between rounded-lg p-4">
                    <div>
                      <div className="text-muted-foreground text-sm">Alternative Solutions</div>
                      <div className="text-foreground text-xl font-semibold">Discussed</div>
                    </div>
                    <CheckCircle className="text-accent-strong h-8 w-8" />
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
                      <code>{`function twoSum(nums, target) {
    const map = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        
        map.set(nums[i], i);
    }
    
    return [];
}`}</code>
                    </pre>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-accent-strong h-4 w-4" />
                      <span className="text-accent-strong text-sm">
                        Optimal O(n) time complexity
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-accent-strong h-4 w-4" />
                      <span className="text-accent-strong text-sm">
                        Clean, readable code structure
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-accent-strong h-4 w-4" />
                      <span className="text-accent-strong text-sm">Proper edge case handling</span>
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
                  <div className="bg-accent/10 border-accent/20 rounded-lg border p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <TrendingUp className="text-accent-strong h-4 w-4" />
                      <span className="text-accent-strong font-semibold">Strengths</span>
                    </div>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>• Immediately identified optimal hash map approach</li>
                      <li>• Excellent explanation of time/space complexity</li>
                      <li>• Discussed edge cases proactively</li>
                      <li>• Clean, production-ready code style</li>
                    </ul>
                  </div>

                  <div className="bg-accent/5 border-accent/10 rounded-lg border p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <Lightbulb className="text-accent-strong h-4 w-4" />
                      <span className="text-accent-strong font-semibold">Additional Insights</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Your solution demonstrates strong algorithmic thinking. You correctly
                      identified that the brute force O(n²) approach could be optimized using a hash
                      map for O(n) lookup time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                      <span className="text-accent-strong font-semibold">95%</span>
                    </div>
                    <Progress value={95} className="bg-muted h-2" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Code Quality</span>
                      <span className="text-accent-strong font-semibold">98%</span>
                    </div>
                    <Progress value={98} className="bg-muted h-2" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Communication</span>
                      <span className="text-accent-strong font-semibold">92%</span>
                    </div>
                    <Progress value={92} className="bg-muted h-2" />
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
