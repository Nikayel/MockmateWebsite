/**
 * useInterviewHints Hook
 *
 * Handles RAG hints fetching and hint feedback.
 * ~150 lines - focused on hint management only.
 */

import { useCallback, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface RAGHint {
  level: number
  hint: string
  id?: string
}

interface UseInterviewHintsProps {
  // State
  selectedScenario: { id: string; title: string } | null
  isInterviewStarted: boolean
  ragHints: RAGHint[]
  isLoadingHints: boolean
  // Setters
  setRagHints: React.Dispatch<React.SetStateAction<RAGHint[]>>
  setIsLoadingHints: (loading: boolean) => void
  setRevealedAIHintIndices: React.Dispatch<React.SetStateAction<Set<number>>>
  setHintFeedback: React.Dispatch<React.SetStateAction<Map<string, "helpful" | "unhelpful">>>
}

export function useInterviewHints(props: UseInterviewHintsProps) {
  const { user } = useAuth()
  const hasFetchedHintsRef = useRef(false)

  // Fetch RAG hints when interview starts
  const fetchRAGHints = useCallback(async () => {
    if (!props.selectedScenario || !user || props.ragHints.length > 0 || props.isLoadingHints) {
      return
    }

    props.setIsLoadingHints(true)

    try {
      const response = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-hints",
          problemId: props.selectedScenario.id,
          problemTitle: props.selectedScenario.title,
          userId: user.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hints && Array.isArray(data.hints)) {
          props.setRagHints(data.hints)
        }
      }
    } catch (error) {
      console.error("Error fetching RAG hints:", error)
    } finally {
      props.setIsLoadingHints(false)
    }
  }, [props.selectedScenario, user, props.ragHints.length, props.isLoadingHints])

  // Auto-fetch hints when interview starts
  useEffect(() => {
    if (props.isInterviewStarted && !hasFetchedHintsRef.current) {
      hasFetchedHintsRef.current = true
      fetchRAGHints()
    }
  }, [props.isInterviewStarted, fetchRAGHints])

  // Submit hint feedback
  const submitHintFeedback = useCallback(
    async (hintIndex: number, feedbackType: "helpful" | "unhelpful") => {
      const hint = props.ragHints[hintIndex]
      if (!hint || !hint.id || !user || !props.selectedScenario) return

      // Optimistic update
      props.setHintFeedback((prev) => new Map(prev).set(hint.id!, feedbackType))

      try {
        await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "hint-feedback",
            hintId: hint.id,
            problemId: props.selectedScenario.id,
            userId: user.id,
            feedback: feedbackType,
          }),
        })

        toast.success("Thanks for the feedback!", { duration: 2000 })
      } catch (error) {
        console.error("Error submitting hint feedback:", error)
        // Revert on error
        props.setHintFeedback((prev) => {
          const next = new Map(prev)
          next.delete(hint.id!)
          return next
        })
      }
    },
    [props.ragHints, props.selectedScenario, user]
  )

  // Reveal a hint
  const revealHint = useCallback(
    (index: number) => {
      props.setRevealedAIHintIndices((prev) => new Set(prev).add(index))
    },
    [props.setRevealedAIHintIndices]
  )

  return {
    fetchRAGHints,
    submitHintFeedback,
    revealHint,
  }
}

export type UseInterviewHintsReturn = ReturnType<typeof useInterviewHints>
