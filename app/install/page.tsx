"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Code,
  Play,
  CheckCircle,
  AlertCircle,
  Terminal,
  Settings,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"

export default function InstallPage() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text)
    setCopiedStep(stepIndex)
    setTimeout(() => setCopiedStep(null), 2000)
  }

  const installSteps = [
    {
      title: "Open VS Code Extensions",
      description: "Launch VS Code and open the Extensions panel",
      command: "Ctrl+Shift+X (Windows/Linux) or Cmd+Shift+X (Mac)",
      icon: <Code className="h-5 w-5" />,
    },
    {
      title: "Search for MockMate",
      description: "Type 'MockMate' in the search bar",
      command: "MockMate",
      icon: <Download className="h-5 w-5" />,
    },
    {
      title: "Install Extension",
      description: "Click 'Install' on the MockMate extension",
      command: "Click Install Button",
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      title: "Reload VS Code",
      description: "Restart VS Code to activate MockMate",
      command: "Ctrl+Shift+P → 'Developer: Reload Window'",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30 mb-6">VS Code Integration</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Install MockMate in
              <span className="text-gradient"> VS Code</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Get started with MockMate in under 2 minutes. Follow our step-by-step guide to integrate AI-powered
              interview practice directly into your development environment.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white px-8 py-4 text-lg"
                onClick={() =>
                  window.open("https://marketplace.visualstudio.com/items?itemName=mockmate.mockmate", "_blank")
                }
              >
                <ExternalLink className="mr-2 h-5 w-5" />
                Open in VS Code Marketplace
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg bg-transparent"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Installation Video
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white mb-12 text-center">Quick Installation Guide</h2>

            <div className="space-y-6">
              {installSteps.map((step, index) => (
                <Card key={index} className="bg-gray-900/50 border-gray-700 glass-effect">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-[#00d9ff] rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {step.icon}
                          <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                        </div>
                        <p className="text-gray-300 mb-3">{step.description}</p>
                        <div className="bg-black/50 rounded-lg p-3 flex items-center justify-between">
                          <code className="text-[#00d9ff] font-mono text-sm">{step.command}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={() => copyToClipboard(step.command, index)}
                          >
                            {copiedStep === index ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white mb-12 text-center">
              Getting Started with MockMate
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Terminal className="h-5 w-5 text-[#00d9ff]" />
                    <span>Start Your First Interview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">
                    Once installed, open the Command Palette and type "MockMate" to see available commands.
                  </p>
                  <div className="bg-black/50 rounded-lg p-3">
                    <code className="text-[#00d9ff] font-mono text-sm">Ctrl+Shift+P → "MockMate: Start Interview"</code>
                  </div>
                  <Button className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                    Try Your First Interview
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-[#00d9ff]" />
                    <span>Configure Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">
                    Customize your interview experience with difficulty levels, programming languages, and more.
                  </p>
                  <div className="bg-black/50 rounded-lg p-3">
                    <code className="text-[#00d9ff] font-mono text-sm">File → Preferences → Settings → MockMate</code>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white hover:text-black bg-transparent"
                  >
                    View Configuration Guide
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white mb-12 text-center">Troubleshooting</h2>

            <div className="space-y-6">
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <span>Extension Not Appearing?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Ensure you're using VS Code version 1.74.0 or higher</li>
                    <li>• Try reloading the window: Ctrl+Shift+P → "Developer: Reload Window"</li>
                    <li>• Check if the extension is enabled in the Extensions panel</li>
                    <li>• Restart VS Code completely</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <span>Commands Not Working?</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Make sure you have an active internet connection</li>
                    <li>• Check VS Code's output panel for error messages</li>
                    <li>• Try disabling other extensions temporarily</li>
                    <li>• Update to the latest version of MockMate</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-400 mb-4">Still having issues?</p>
              <Button
                variant="outline"
                className="border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff] hover:text-white bg-transparent"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
