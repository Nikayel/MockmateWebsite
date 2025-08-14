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
  Target,
  Lightbulb,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

export default function BinaryTreeGoodPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Header Section */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Link href="/samples" className="inline-flex items-center text-[#ff5733] hover:text-[#ff5733]/80 mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Samples
            </Link>

            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>
                  <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30">Completed</Badge>
                </div>
                <h1 className="text-4xl font-heading font-bold text-white">Binary Tree Inorder Traversal</h1>
                <p className="text-gray-300 mt-2">Tree traversal with recursive and iterative approaches</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-yellow-400 mb-1">B+</div>
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
                      <div className="text-white text-xl font-semibold">25 minutes</div>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Complexity Accuracy</div>
                      <div className="text-white text-xl font-semibold">Good</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-yellow-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Edge Cases Discussed</div>
                      <div className="text-white text-xl font-semibold">Yes</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Alternative Solutions</div>
                      <div className="text-white text-xl font-semibold">Partial</div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Code Solution */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Code className="h-5 w-5 text-[#ff5733]" />
                    <span>Your Solution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-lg p-4">
                    <pre className="text-sm text-white font-mono leading-relaxed">
                      <code>{`function inorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        traverse(node.left);
        result.push(node.val);
        traverse(node.right);
    }
    
    traverse(root);
    return result;
}`}</code>
                    </pre>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Correct recursive approach</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Proper base case handling</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">Could discuss iterative solution</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Feedback */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-[#ff5733]" />
                    <span>AI Feedback</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 font-semibold">Strengths</span>
                    </div>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Solid understanding of tree traversal concepts</li>
                      <li>• Clean recursive implementation</li>
                      <li>• Good explanation of the algorithm flow</li>
                      <li>• Handled null node edge cases correctly</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">Areas for Improvement</span>
                    </div>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Could have discussed iterative approach with stack</li>
                      <li>• Space complexity analysis could be more detailed</li>
                      <li>• Consider Morris traversal for O(1) space</li>
                    </ul>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 font-semibold">Next Steps</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Practice implementing iterative tree traversals using explicit stacks. This will help you
                      understand the relationship between recursive and iterative approaches.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="mt-8 bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-[#ff5733]" />
                  <span>Detailed Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Problem Understanding</span>
                      <span className="text-yellow-400 font-semibold">85%</span>
                    </div>
                    <Progress value={85} className="h-2 bg-gray-800" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Code Quality</span>
                      <span className="text-yellow-400 font-semibold">82%</span>
                    </div>
                    <Progress value={82} className="h-2 bg-gray-800" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Communication</span>
                      <span className="text-yellow-400 font-semibold">78%</span>
                    </div>
                    <Progress value={78} className="h-2 bg-gray-800" />
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
                  <Button className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white flex-1">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry Session
                  </Button>
                  <Button className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white flex-1">
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
