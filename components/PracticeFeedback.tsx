"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, TrendingUp, Target, Zap, Code, MessageSquare, Activity } from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

interface FeedbackSection {
  tldr: string
  scores: {
    correctness: number
    efficiency: number
    codeQuality: number
    reasoning: number
    aiCollaboration: number
    overall: number
  }
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  aiWatchlist: string
}

interface PracticeFeedbackProps {
  feedback: string
  performanceScore: number
  testsPassed: number
  testsTotal: number
  timeComplexity?: string
  spaceComplexity?: string
  efficiencyScore?: number
}

function parseFeedback(feedback: string): FeedbackSection {
  const sections: FeedbackSection = {
    tldr: "",
    scores: {
      correctness: 0,
      efficiency: 0,
      codeQuality: 0,
      reasoning: 0,
      aiCollaboration: 0,
      overall: 0,
    },
    whatWorked: [],
    fixNext: [],
    actionPlan: [],
    aiWatchlist: "",
  }

  // Extract TL;DR
  const tldrMatch = feedback.match(/\*\*TL;DR\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (tldrMatch) sections.tldr = tldrMatch[1].trim()

  // Extract scores
  const scoreSection = feedback.match(/\*\*Score Snapshot\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (scoreSection) {
    const scoreText = scoreSection[1]
    sections.scores.correctness = parseInt(scoreText.match(/Correctness[:\s]*(\d+)\/10/i)?.[1] || "0")
    sections.scores.efficiency = parseInt(scoreText.match(/Efficiency[:\s]*(\d+)\/10/i)?.[1] || "0")
    sections.scores.codeQuality = parseInt(scoreText.match(/Code Quality[:\s]*(\d+)\/10/i)?.[1] || "0")
    sections.scores.reasoning = parseInt(scoreText.match(/Reasoning.*?[:\s]*(\d+)\/10/i)?.[1] || "0")
    sections.scores.aiCollaboration = parseInt(scoreText.match(/AI Collaboration[:\s]*(\d+)\/10/i)?.[1] || "0")
    sections.scores.overall = parseInt(scoreText.match(/Overall[:\s]*(\d+)\/10/i)?.[1] || "0")
  }

  // Extract What Worked
  const whatWorkedMatch = feedback.match(/\*\*What Worked\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (whatWorkedMatch) {
    sections.whatWorked = whatWorkedMatch[1]
      .split(/\n[-•]/)
      .map(s => s.trim())
      .filter(s => s && s.length > 0)
  }

  // Extract Fix Next
  const fixNextMatch = feedback.match(/\*\*Fix Next\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (fixNextMatch) {
    sections.fixNext = fixNextMatch[1]
      .split(/\n[-•]/)
      .map(s => s.trim())
      .filter(s => s && s.length > 0)
  }

  // Extract Action Plan
  const actionPlanMatch = feedback.match(/\*\*Action Plan\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (actionPlanMatch) {
    sections.actionPlan = actionPlanMatch[1]
      .split(/\n\d+\./)
      .map(s => s.trim())
      .filter(s => s && s.length > 0)
  }

  // Extract AI Watchlist
  const aiWatchlistMatch = feedback.match(/\*\*AI & Communication Watchlist\*\*[:\s]*([\s\S]+?)(?=\n\*\*|$)/)
  if (aiWatchlistMatch) sections.aiWatchlist = aiWatchlistMatch[1].trim()

  return sections
}

export default function PracticeFeedback({
  feedback,
  performanceScore,
  testsPassed,
  testsTotal,
  timeComplexity,
  spaceComplexity,
  efficiencyScore,
}: PracticeFeedbackProps) {
  const sections = parseFeedback(feedback)

  const radarData = [
    { subject: "Correctness", value: sections.scores.correctness, fullMark: 10 },
    { subject: "Efficiency", value: sections.scores.efficiency, fullMark: 10 },
    { subject: "Code Quality", value: sections.scores.codeQuality, fullMark: 10 },
    { subject: "Reasoning", value: sections.scores.reasoning, fullMark: 10 },
    { subject: "AI Collab", value: sections.scores.aiCollaboration, fullMark: 10 },
  ]

  const barData = [
    { name: "Correctness", score: sections.scores.correctness },
    { name: "Efficiency", score: sections.scores.efficiency },
    { name: "Code Quality", score: sections.scores.codeQuality },
    { name: "Reasoning", score: sections.scores.reasoning },
    { name: "AI Collab", score: sections.scores.aiCollaboration },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 8) return "#10b981" // green
    if (score >= 6) return "#eab308" // yellow
    return "#ef4444" // red
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return "bg-green-600"
    if (score >= 6) return "bg-yellow-600"
    return "bg-red-600"
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-4 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-400 mx-auto" />
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">Interview Complete!</h2>
          <p className="text-sm sm:text-base text-gray-300 px-2">
            {sections.tldr || "Brutally honest review incoming. Scroll through the full breakdown."}
          </p>
        </div>
      </div>

      {/* Overall Score Hero */}
      <Card className="bg-black border border-white/10">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            <div className="text-center lg:text-left w-full lg:w-auto">
              <p className="text-xs sm:text-sm text-gray-400 mb-1 uppercase tracking-wider">Overall Performance</p>
              <div className="flex items-baseline justify-center lg:justify-start gap-2">
                <span className="text-5xl sm:text-7xl font-bold text-white">{performanceScore}</span>
                <span className="text-2xl sm:text-4xl text-gray-500">/10</span>
              </div>
              <div className="mt-2 flex items-center justify-center lg:justify-start gap-2">
                <Badge className={`${getScoreBgColor(performanceScore)} text-white text-xs`}>
                  {performanceScore >= 8 ? "Excellent" : performanceScore >= 6 ? "Good" : "Needs Work"}
                </Badge>
                <span className="text-xs text-gray-500">
                  {testsPassed}/{testsTotal} tests passed
                </span>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="w-full lg:w-auto h-[250px] sm:h-[300px] lg:h-[280px] lg:min-w-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    className="text-xs sm:text-sm"
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <Radar name="Score" dataKey="value" stroke="#ff5733" fill="#ff5733" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bar Chart */}
        <Card className="bg-black border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" domain={[0, 10]} stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fontSize: 10 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Complexity & Metrics */}
        <Card className="bg-black border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
              <Code className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              Complexity Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Time Complexity</p>
                <p className="text-lg sm:text-xl font-mono font-bold text-white">
                  {timeComplexity || "O(?)"}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Space Complexity</p>
                <p className="text-lg sm:text-xl font-mono font-bold text-white">
                  {spaceComplexity || "O(?)"}
                </p>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Efficiency Score</p>
                <p className="text-lg sm:text-xl font-bold text-white">{efficiencyScore || "—"}/100</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${efficiencyScore || 0}%`,
                    backgroundColor: getScoreColor((efficiencyScore || 0) / 10),
                  }}
                />
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Test Coverage</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {testsPassed}/{testsTotal}
                </p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What Worked */}
      {sections.whatWorked.length > 0 && (
        <Card className="bg-black border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              What Worked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 sm:space-y-3">
              {sections.whatWorked.map((item, index) => (
                <li key={index} className="flex items-start gap-2 sm:gap-3">
                  <span className="text-green-500 mt-1 flex-shrink-0">✓</span>
                  <span className="text-xs sm:text-sm text-gray-200 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Fix Next */}
      {sections.fixNext.length > 0 && (
        <Card className="bg-black border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              Fix Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 sm:space-y-3">
              {sections.fixNext.map((item, index) => (
                <li key={index} className="flex items-start gap-2 sm:gap-3">
                  <span className="bg-red-500/20 text-red-500 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-200 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {sections.actionPlan.length > 0 && (
        <Card className="bg-black border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff5733]" />
              Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {sections.actionPlan.map((item, index) => (
                <div key={index} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="bg-[#ff5733] text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-200 leading-relaxed pt-0.5 sm:pt-1">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI & Communication Watchlist */}
      {sections.aiWatchlist && (
        <Card className="bg-black border border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              AI & Communication Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">{sections.aiWatchlist}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
