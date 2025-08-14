import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Download,
  Settings,
  Play,
  MessageSquare,
  BarChart3,
  Code,
  Zap,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30 mb-6">Documentation</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              MockMate
              <span className="text-gradient"> Documentation</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Everything you need to know to get started with MockMate and master your coding interviews.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white text-center mb-12">Quick Start Guide</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <Download className="h-12 w-12 text-[#ff5733]" />
                  </div>
                  <CardTitle className="text-white">1. Install</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">Install MockMate from the VS Code Marketplace with one click.</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <Settings className="h-12 w-12 text-[#ff5733]" />
                  </div>
                  <CardTitle className="text-white">2. Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">Configure your preferences and connect your GitHub account.</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <Play className="h-12 w-12 text-[#ff5733]" />
                  </div>
                  <CardTitle className="text-white">3. Practice</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">Start your first interview session and begin practicing.</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <BarChart3 className="h-12 w-12 text-[#ff5733]" />
                  </div>
                  <CardTitle className="text-white">4. Improve</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">Review feedback and track your progress over time.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Documentation */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Installation */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <Download className="h-6 w-6 text-[#ff5733]" />
                  <span>Installation & Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h4 className="text-white font-semibold">Installing from VS Code Marketplace</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open VS Code</li>
                  <li>Go to Extensions (Ctrl+Shift+X)</li>
                  <li>Search for "MockMate"</li>
                  <li>Click "Install" on the MockMate extension</li>
                  <li>Reload VS Code when prompted</li>
                </ol>

                <h4 className="text-white font-semibold mt-6">Initial Configuration</h4>
                <p>After installation, you'll see the MockMate icon in your activity bar. Click it to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Sign in with your GitHub account</li>
                  <li>Set your experience level (Beginner, Intermediate, Advanced)</li>
                  <li>Choose your preferred programming languages</li>
                  <li>Configure interview difficulty settings</li>
                </ul>

                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Pro Tip:</strong> Enable GitHub integration to sync your progress across devices and get
                    personalized recommendations based on your coding history.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features Guide */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <Zap className="h-6 w-6 text-[#ff5733]" />
                  <span>Core Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-6">
                <div>
                  <h4 className="text-white font-semibold flex items-center space-x-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-[#ff5733]" />
                    <span>AI Interviewer</span>
                  </h4>
                  <p>
                    Our AI interviewer conducts realistic technical interviews, asking follow-up questions and providing
                    hints when needed. It adapts to your skill level and provides constructive feedback.
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Natural conversation flow</li>
                    <li>Contextual hints and guidance</li>
                    <li>Behavioral interview questions</li>
                    <li>Real-time code review</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-semibold flex items-center space-x-2 mb-3">
                    <Code className="h-5 w-5 text-[#ff5733]" />
                    <span>Coding Challenges</span>
                  </h4>
                  <p>Practice with a curated collection of coding problems from easy to hard difficulty levels.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Array and string manipulation</li>
                    <li>Data structures (trees, graphs, heaps)</li>
                    <li>Dynamic programming</li>
                    <li>System design problems</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-semibold flex items-center space-x-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-[#ff5733]" />
                    <span>Performance Analytics</span>
                  </h4>
                  <p>Track your progress with detailed analytics and personalized improvement recommendations.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Time complexity analysis</li>
                    <li>Code quality metrics</li>
                    <li>Communication skills assessment</li>
                    <li>Progress tracking over time</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Commands & Shortcuts */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-[#ff5733]" />
                  <span>Commands & Shortcuts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h4 className="text-white font-semibold">Command Palette Commands</h4>
                <div className="bg-gray-800/50 p-4 rounded-lg space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>MockMate: Start Interview</span>
                    <span className="text-gray-400">Ctrl+Shift+M</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MockMate: View Progress</span>
                    <span className="text-gray-400">Ctrl+Shift+P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MockMate: Settings</span>
                    <span className="text-gray-400">Ctrl+Shift+S</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MockMate: Export Report</span>
                    <span className="text-gray-400">Ctrl+Shift+E</span>
                  </div>
                </div>

                <h4 className="text-white font-semibold mt-6">During Interview Shortcuts</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>Ctrl+H:</strong> Request hint from AI interviewer
                  </li>
                  <li>
                    <strong>Ctrl+R:</strong> Run code and see output
                  </li>
                  <li>
                    <strong>Ctrl+T:</strong> Submit solution for review
                  </li>
                  <li>
                    <strong>Esc:</strong> Pause interview session
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <Settings className="h-6 w-6 text-[#ff5733]" />
                  <span>Troubleshooting</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h4 className="text-white font-semibold">Common Issues</h4>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-white">Extension not loading</p>
                    <p className="text-sm">
                      Try reloading VS Code (Ctrl+Shift+P → "Developer: Reload Window") or reinstalling the extension.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-white">AI responses are slow</p>
                    <p className="text-sm">
                      Check your internet connection. AI responses require a stable connection to our servers.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-white">GitHub authentication failed</p>
                    <p className="text-sm">
                      Ensure you have the latest version of VS Code and try signing out and back in to GitHub.
                    </p>
                  </div>
                </div>

                <h4 className="text-white font-semibold mt-6">Getting Help</h4>
                <p>If you're still experiencing issues:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Check our GitHub Issues page for known problems</li>
                  <li>Email support@mockmate.dev with your issue details</li>
                  <li>Join our Discord community for real-time help</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Install MockMate now and start practicing your coding interviews with AI-powered feedback.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg">
              Install Extension
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg bg-transparent"
            >
              View on GitHub
              <ExternalLink className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
