"use client"

import { Download } from "lucide-react"

interface FeedbackActionsProps {
  onExport?: () => void
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
  // Weights from SCORE_WEIGHTS.performance in lib/scoring/types.ts
  // Understanding: 25%, Problem-Solving: 25%, Code Quality: 30%, Communication: 20%
  const criteria = [
    { name: "Understanding", score: scores.understanding, weight: "25%" },
    { name: "Problem-Solving", score: scores.problemSolving, weight: "25%" },
    { name: "Code Quality", score: scores.codeQuality, weight: "30%" },
    { name: "Communication", score: scores.communication, weight: "20%" },
  ]
  criteria.forEach((c) => {
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
  onExport,
  overallScore,
  problemTitle,
  grade,
  scores,
}: FeedbackActionsProps) {
  const handleExport = async () => {
    try {
      if (onExport) {
        onExport()
      } else {
        await generatePDF(problemTitle || "Interview Session", grade, overallScore, scores, [])
      }
    } catch (error) {
      console.error("Failed to export PDF:", error)
      alert("Failed to export PDF. Please try again.")
    }
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      title="Export feedback as PDF"
    >
      <Download className="h-3 w-3" />
      Export
    </button>
  )
}
