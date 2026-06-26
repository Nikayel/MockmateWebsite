"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface Recommendation {
  problemId: string
  title: string
  text: string
  similarity: number
  difficulty: string
  type: string
}

interface NextProblemRecommendationsProps {
  userId?: string
  currentProblemText?: string
  currentProblemId?: string
  onSelectProblem?: (problemId: string) => void
}

export function NextProblemRecommendations({
  userId,
  currentProblemText,
  currentProblemId,
  onSelectProblem,
}: NextProblemRecommendationsProps) {
  const { firebaseUser } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!userId || !currentProblemText || !firebaseUser) {
      setLoading(false)
      return
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true)
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/rag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "get-next-problems",
            userId,
            currentProblemText,
            currentProblemId,
          }),
        })

        const data = await response.json()

        if (data.recommendations) {
          setRecommendations(data.recommendations)
        } else if (data.error) {
          setError(data.error)
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err)
        setError("Failed to load recommendations")
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId, currentProblemText, currentProblemId, firebaseUser])

  const handleSelectProblem = (problemId: string) => {
    if (onSelectProblem) {
      onSelectProblem(problemId)
    } else {
      router.push(`/interview?scenario=${problemId}`)
    }
  }

  if (!userId || !currentProblemText) {
    return null
  }

  if (loading) {
    return (
      <Card className="glass-effect mb-8 border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <Sparkles className="h-5 w-5 text-[#c4703f]" />
            <span>Similar Problems You Haven't Solved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#c4703f]" />
            <span className="ml-2 text-muted-foreground">Finding similar problems...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-effect mb-8 border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <Sparkles className="h-5 w-5 text-[#c4703f]" />
            <span>Similar Problems You Haven't Solved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card className="glass-effect mb-8 border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <Sparkles className="h-5 w-5 text-[#c4703f]" />
            <span>Similar Problems You Haven't Solved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No similar unsolved problems found. Try exploring new problem types!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect mb-8 border-border bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-foreground">
          <Sparkles className="h-5 w-5 text-[#c4703f]" />
          <span>Similar Problems You Haven't Solved</span>
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Powered by RAG - These problems are similar to what you just solved
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={rec.problemId || index}
              className="rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:border-[#c4703f]/50"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="mb-1 font-medium text-foreground">{rec.title}</h4>
                  <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{rec.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge className="border-[#c4703f]/30 bg-[#c4703f]/20 text-[#c4703f]">
                      {rec.difficulty}
                    </Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {rec.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{rec.similarity}% similar</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleSelectProblem(rec.problemId)}
                className="mt-3 w-full bg-[#c4703f] text-white hover:bg-[#c4703f]/80"
                size="sm"
              >
                Try This Problem
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
