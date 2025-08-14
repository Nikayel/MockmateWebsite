"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Code2, MessageSquare, BarChart3, Zap, Shield, Play } from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: Brain,
    title: "AI-Powered Interviewer",
    description:
      "Practice with an intelligent AI that adapts to your skill level and provides realistic interview scenarios.",
    color: "text-[#ff5733]",
  },
  {
    icon: Code2,
    title: "Real-time Coding Partner",
    description: "Get instant feedback and suggestions as you code, just like having a senior developer by your side.",
    color: "text-blue-400",
  },
  {
    icon: MessageSquare,
    title: "Interactive Conversations",
    description:
      "Engage in natural conversations about your code, architecture decisions, and problem-solving approach.",
    color: "text-green-400",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your progress with detailed metrics on coding speed, accuracy, and problem-solving efficiency.",
    color: "text-purple-400",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description: "Receive immediate insights on your code quality, optimization opportunities, and best practices.",
    color: "text-yellow-400",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your code and practice sessions remain completely private and secure within your VS Code environment.",
    color: "text-cyan-400",
  },
]

export function FeaturesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
            Powerful Features for
            <span className="text-gradient"> Modern Developers</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Explore capabilities that elevate your workflow with custom shortcuts, intelligent code suggestions, and
            real-time collaboration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`bg-gray-900/50 border-gray-700 hover:border-[#ff5733]/50 transition-all duration-300 cursor-pointer glass-effect ${
                hoveredIndex === index ? "transform scale-105" : ""
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-lg bg-gray-800 ${hoveredIndex === index ? "animate-pulse" : ""}`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive Demo Section */}
        <div className="mt-20 text-center">
          <div className="bg-gray-900/50 rounded-2xl p-8 glass-effect max-w-4xl mx-auto">
            <h3 className="text-2xl font-heading font-bold text-white mb-6">See MockMate in Action</h3>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center mb-6">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/FeedbackSummeryMockup-GFSpAQsPcwjnrAW21qXk63EEXS2Nv4.png"
                alt="MockMate Feedback Summary Interface"
                className="rounded-lg opacity-80 hover:opacity-100 transition-opacity duration-300 max-w-full max-h-full object-contain"
              />
            </div>
            <Link href="/demo">
              <Button className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-6 py-3">
                <Play className="mr-2 h-5 w-5" />
                Try Interactive Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
