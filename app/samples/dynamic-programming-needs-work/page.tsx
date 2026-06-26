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
    <main className="min-h-screen bg-black">
      <Header />

      {/* Header Section */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Link href="/samples" className="inline-flex items-center text-[#c4703f] hover:text-[#c4703f]/80 mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Samples
            </Link>

            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Hard</Badge>
                  <Badge className="bg-[#c4703f]/20 text-[#c4703f] border-[#c4703f]/30">Completed</Badge>
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">Longest Increasing Subsequence</h1>
                <p className="text-gray-300 mt-2">Dynamic programming optimization problem</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-400 mb-1">C</div>
                <div className="text-gray-400">Overall Grade</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Summary */}
      <section className="py-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Time Taken</div>
                      <div className="text-white text-xl font-semibold">45 minutes</div>
                    </div>
                    <Clock className="h-8 w-8 text-red-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Complexity Accuracy</div>
                      <div className="text-white text-xl font-semibold">Poor</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Edge Cases Discussed</div>
                      <div className="text-white text-xl font-semibold">No</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Alternative Solutions</div>
                      <div className="text-white text-xl font-semibold">No</div>
                    </div>
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code Solution */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Code className="h-5 w-5 text-[#c4703f]" />
                    <span>Your Solution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-lg p-4">
                    <pre className="text-sm text-white font-mono leading-relaxed">
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
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 text-sm">Incorrect algorithm - greedy approach</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 text-sm">O(n²) time complexity, not optimal</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">Misses optimal substructure</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Feedback */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-[#c4703f]" />
                    <span>AI Feedback</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 font-semibold">Critical Issues</span>
                    </div>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Used greedy approach instead of dynamic programming</li>
                      <li>• Algorithm produces incorrect results for many inputs</li>
                      <li>• Missed the optimal substructure property</li>
                      <li>• No consideration of overlapping subproblems</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">What You Missed</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      This is a classic DP problem. The key insight is that for each position, you need to consider all
                      previous elements that are smaller and build upon their LIS lengths.
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 font-semibold">Study Recommendations</span>
                    </div>
                    <ul className="text-gray-300 text-sm space-y-1">
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
            <Card className="mt-8 bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-[#c4703f]" />
                  <span>Correct DP Solution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-lg p-4">
                  <pre className="text-sm text-white font-mono leading-relaxed">
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
                <div className="mt-4 text-gray-300 text-sm">
                  <p>
                    <strong>Key insight:</strong> dp[i] represents the length of the longest increasing subsequence
                    ending at index i. For each position, we check all previous positions and extend their LIS if the
                    current element is larger.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="mt-8 bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-[#c4703f]" />
                  <span>Detailed Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Problem Understanding</span>
                      <span className="text-red-400 font-semibold">45%</span>
                    </div>
                    <Progress value={45} className="h-2 bg-gray-800" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Code Quality</span>
                      <span className="text-red-400 font-semibold">35%</span>
                    </div>
                    <Progress value={35} className="h-2 bg-gray-800" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Communication</span>
                      <span className="text-red-400 font-semibold">55%</span>
                    </div>
                    <Progress value={55} className="h-2 bg-gray-800" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="mt-8 bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="bg-gray-700 hover:bg-gray-600 text-white flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report (JSON)
                  </Button>
                  <Button className="bg-[#c4703f] hover:bg-[#c4703f]/80 text-white flex-1">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry Session
                  </Button>
                  <Button className="bg-[#c4703f] hover:bg-[#c4703f]/80 text-white flex-1">
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
