"use client"

import { Button } from "@/components/ui/button"
import {
  RotateCcw,
  Play,
  Download,
  XCircle
} from "lucide-react"

interface FeedbackActionsProps {
  onRetry?: () => void
  onNewProblem?: () => void
  onExport?: () => void
  onEndInterview?: () => void
  overallScore: number
  problemTitle?: string
  grade: string
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  }
}

async function generatePDF(
  problemTitle: string,
  grade: string,
  overallScore: number,
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  },
  fixNext: string[]
) {
  const { default: jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  const margin = 20
  let y = 20

  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("MockMate - Interview Feedback", margin, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`${problemTitle || "Interview Session"} | ${new Date().toLocaleDateString()}`, margin, y)
  y += 15

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(`Grade: ${grade} (${overallScore}/100)`, margin, y)
  y += 12

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const criteria = [
    { name: "Understanding", score: scores.understanding, weight: "30%" },
    { name: "Problem-Solving", score: scores.problemSolving, weight: "25%" },
    { name: "Code Quality", score: scores.codeQuality, weight: "25%" },
    { name: "Communication", score: scores.communication, weight: "20%" },
  ]
  criteria.forEach(c => {
    doc.text(`${c.name} (${c.weight}): ${c.score}%`, margin + 5, y)
    y += 6
  })
  y += 8

  if (fixNext.length > 0) {
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Areas to Improve", margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    fixNext.slice(0, 3).forEach((item, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${item}`, 170)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5 + 2
    })
  }

  doc.save(`mockmate-feedback-${Date.now()}.pdf`)
}

export function FeedbackActions({
  onRetry,
  onNewProblem,
  onExport,
  onEndInterview,
  overallScore,
  problemTitle,
  grade,
  scores
}: FeedbackActionsProps) {
  const handleExport = async () => {
    if (onExport) {
      onExport()
    } else {
      await generatePDF(problemTitle || "Interview Session", grade, overallScore, scores, [])
    }
  }

  return (
    <div className="flex border-t border-zinc-800/50 text-xs">
      <button
        onClick={onRetry}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Retry
      </button>
      <div className="w-px bg-zinc-800/50" />
      <button
        onClick={onNewProblem}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white hover:bg-zinc-800/50 transition-colors"
      >
        <Play className="h-3.5 w-3.5" />
        New Problem
      </button>
      <div className="w-px bg-zinc-800/50" />
      <button
        onClick={handleExport}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
      {onEndInterview && (
        <>
          <div className="w-px bg-zinc-800/50" />
          <button
            onClick={onEndInterview}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            End
          </button>
        </>
      )}
    </div>
  )
}
