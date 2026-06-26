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
                  <Badge className="bg-[#c4703f]/20 text-[#c4703f] border-[#c4703f]/30">Easy</Badge>
                  <Badge className="bg-[#c4703f]/20 text-[#c4703f] border-[#c4703f]/30">Completed</Badge>
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">Two Sum Problem</h1>
                <p className="text-gray-300 mt-2">Array manipulation with hash map optimization</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-[#c4703f] mb-1">A+</div>
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
                      <div className="text-white text-xl font-semibold">8 minutes</div>
                    </div>
                    <Clock className="h-8 w-8 text-[#c4703f]" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Complexity Accuracy</div>
                      <div className="text-white text-xl font-semibold">Perfect</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-[#c4703f]" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Edge Cases Discussed</div>
                      <div className="text-white text-xl font-semibold">Yes</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-[#c4703f]" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Alternative Solutions</div>
                      <div className="text-white text-xl font-semibold">Discussed</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-[#c4703f]" />
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
                      <CheckCircle className="h-4 w-4 text-[#c4703f]" />
                      <span className="text-[#c4703f] text-sm">Optimal O(n) time complexity</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[#c4703f]" />
                      <span className="text-[#c4703f] text-sm">Clean, readable code structure</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[#c4703f]" />
                      <span className="text-[#c4703f] text-sm">Proper edge case handling</span>
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
                  <div className="bg-[#c4703f]/10 border border-[#c4703f]/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-[#c4703f]" />
                      <span className="text-[#c4703f] font-semibold">Strengths</span>
                    </div>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Immediately identified optimal hash map approach</li>
                      <li>• Excellent explanation of time/space complexity</li>
                      <li>• Discussed edge cases proactively</li>
                      <li>• Clean, production-ready code style</li>
                    </ul>
                  </div>

                  <div className="bg-[#c4703f]/5 border border-[#c4703f]/10 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-[#c4703f]" />
                      <span className="text-[#c4703f] font-semibold">Additional Insights</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Your solution demonstrates strong algorithmic thinking. You correctly identified that the brute
                      force O(n²) approach could be optimized using a hash map for O(n) lookup time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                      <span className="text-[#c4703f] font-semibold">95%</span>
                    </div>
                    <Progress value={95} className="h-2 bg-gray-800" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Code Quality</span>
                      <span className="text-[#c4703f] font-semibold">98%</span>
                    </div>
                    <Progress value={98} className="h-2 bg-gray-800" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Communication</span>
                      <span className="text-[#c4703f] font-semibold">92%</span>
                    </div>
                    <Progress value={92} className="h-2 bg-gray-800" />
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
