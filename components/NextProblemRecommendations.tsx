"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!userId || !currentProblemText) {
      setLoading(false)
      return
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/rag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-next-problems',
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
        console.error('Error fetching recommendations:', err)
        setError('Failed to load recommendations')
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId, currentProblemText, currentProblemId])

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
      <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-[#00d9ff]" />
            <span>Similar Problems You Haven't Solved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-[#00d9ff] animate-spin" />
            <span className="ml-2 text-gray-400">Finding similar problems...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-[#00d9ff]" />
            <span>Similar Problems You Haven't Solved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-[#00d9ff]" />
            <span>Similar Problems You Haven't Solved</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            No similar unsolved problems found. Try exploring new problem types!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-[#00d9ff]" />
          <span>Similar Problems You Haven't Solved</span>
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          Powered by RAG - These problems are similar to what you just solved
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={rec.problemId || index}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-[#00d9ff]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">{rec.title}</h4>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-2">{rec.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30">
                      {rec.difficulty}
                    </Badge>
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      {rec.type}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {rec.similarity}% similar
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleSelectProblem(rec.problemId)}
                className="w-full mt-3 bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black"
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

