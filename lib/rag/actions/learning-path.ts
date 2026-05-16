import { NextResponse } from "next/server"
import { getUserPerformanceProfile } from "@/lib/rag"

export async function handleGetLearningPath(params: { userId: string; targetSkills?: string[] }) {
  const { userId, targetSkills = [] } = params

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const profile = await getUserPerformanceProfile(userId)

  if (!profile) {
    return NextResponse.json({
      learningPath: [
        {
          step: 1,
          focus: "Start with fundamentals",
          recommendation: "Begin with easy array and string problems to build confidence",
          estimatedProblems: 5,
        },
        {
          step: 2,
          focus: "Learn data structures",
          recommendation: "Practice with hash maps, sets, and linked lists",
          estimatedProblems: 10,
        },
        {
          step: 3,
          focus: "Algorithm patterns",
          recommendation: "Focus on two-pointer and sliding window techniques",
          estimatedProblems: 10,
        },
      ],
      message: "Welcome! Here's a recommended path to get started.",
    })
  }

  const learningPath = []
  let step = 1

  for (const weakness of profile.weaknessAreas.slice(0, 2)) {
    learningPath.push({
      step: step++,
      focus: `Improve ${weakness}`,
      recommendation: `Practice ${weakness} problems at easy-medium difficulty to build skills`,
      estimatedProblems: 5,
      currentScore: profile.scoresByType[weakness]?.slice(-1)[0] || 0,
    })
  }

  if (profile.recentTrend === "improving") {
    for (const strength of profile.strengthAreas.slice(0, 1)) {
      learningPath.push({
        step: step++,
        focus: `Challenge yourself in ${strength}`,
        recommendation: `You're doing well! Try harder ${strength} problems to push further`,
        estimatedProblems: 3,
        currentScore: profile.scoresByType[strength]?.slice(-1)[0] || 0,
      })
    }
  }

  for (const skill of targetSkills.slice(0, 2)) {
    if (!profile.strengthAreas.includes(skill) && !profile.weaknessAreas.includes(skill)) {
      learningPath.push({
        step: step++,
        focus: `Learn ${skill}`,
        recommendation: `New skill! Start with easy ${skill} problems to learn the patterns`,
        estimatedProblems: 5,
      })
    }
  }

  return NextResponse.json({
    learningPath,
    profile: {
      totalSessions: profile.totalSessions,
      averageScore: Math.round(profile.averageScore),
      recentTrend: profile.recentTrend,
    },
    message:
      profile.recentTrend === "improving"
        ? "Great progress! Keep up the momentum."
        : profile.recentTrend === "declining"
          ? "Let's get back on track with some fundamentals."
          : "Steady progress. Time to push to the next level!",
  })
}
