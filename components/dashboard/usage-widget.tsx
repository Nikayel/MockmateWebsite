"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { Cpu, Mic, Code, MessageSquare } from "lucide-react"

interface UsageData {
  period: {
    start: string
    end: string
  }
  budget: {
    cap: number
    used: number
    remaining: number
    usedPercent: number
  }
  totals: {
    requests: number
    tokens: number
    cost: number
  }
  services: {
    llm: { requests: number; tokens: number; cost: number }
    voice: { requests: number; durationSeconds: number; cost: number }
    embeddings: { requests: number; characterCount: number; cost: number }
    total: { requests: number; cost: number }
  }
}

export function UsageWidget() {
  const { firebaseUser } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsage = async () => {
      if (!firebaseUser) return

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/usage", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUsage(data.data)
          }
        }
      } catch (error) {
        console.error("Error loading usage:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUsage()
  }, [firebaseUser])

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium flex items-center">
            <Cpu className="h-4 w-4 mr-2" />
            AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-24 bg-gray-800/50 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium flex items-center">
            <Cpu className="h-4 w-4 mr-2" />
            AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white mb-1">0</div>
          <p className="text-xs text-gray-400">Total tokens used this month</p>
        </CardContent>
      </Card>
    )
  }

  const totalTokens = usage.totals.tokens + (usage.services.embeddings.characterCount / 4)
  const budgetPercent = usage.budget.usedPercent

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm font-medium flex items-center">
          <Cpu className="h-4 w-4 mr-2" />
          AI Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white mb-1">
          {totalTokens >= 1000
            ? `${(totalTokens / 1000).toFixed(1)}K`
            : Math.round(totalTokens)
          }
        </div>
        <p className="text-xs text-gray-400 mb-3">Total tokens this month</p>

        {/* Budget progress */}
        <Progress
          value={Math.min(100, budgetPercent)}
          className="h-2 mb-2"
        />
        <p className="text-xs text-gray-500">
          {budgetPercent.toFixed(0)}% of ${usage.budget.cap} budget used
        </p>

        {/* Mini service breakdown */}
        <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 text-center">
          <div title="LLM Requests">
            <MessageSquare className="h-3 w-3 mx-auto text-blue-400 mb-1" />
            <div className="text-xs text-white font-mono">{usage.services.llm.requests}</div>
          </div>
          <div title="Voice Minutes">
            <Mic className="h-3 w-3 mx-auto text-purple-400 mb-1" />
            <div className="text-xs text-white font-mono">
              {Math.round(usage.services.voice.durationSeconds / 60)}m
            </div>
          </div>
          <div title="Embedding Requests">
            <Code className="h-3 w-3 mx-auto text-yellow-400 mb-1" />
            <div className="text-xs text-white font-mono">{usage.services.embeddings.requests}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
