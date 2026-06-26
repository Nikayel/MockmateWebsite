"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  Target,
  Lightbulb,
  Code,
  Zap,
  Clock,
  HardDrive,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInterviewStore, type WorkspaceFile } from "@/lib/stores"
import type { Scenario, DSAScenario } from "@/lib/scenarios"
import { PATTERN_METADATA, type DSAPattern } from "@/lib/types/dsa-patterns"
import { toast } from "sonner"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"

interface ProblemPanelProps {
  scenario: Scenario
  onFileSelect: (file: WorkspaceFile) => void
}

// Infer pattern from scenario
function inferPattern(scenario: Scenario): DSAPattern | null {
  if (scenario.type !== "dsa") return null
  const dsaScenario = scenario as DSAScenario
  if (dsaScenario.pattern) return dsaScenario.pattern

  const tags = scenario.tags.map((t) => t.toLowerCase())
  const title = scenario.title.toLowerCase()

  if (
    tags.includes("hash-table") ||
    tags.includes("array") ||
    title.includes("two sum") ||
    title.includes("contains duplicate") ||
    title.includes("anagram")
  ) {
    return "arrays-hashing"
  }
  if (
    tags.includes("two-pointers") ||
    title.includes("3sum") ||
    title.includes("container") ||
    title.includes("trapping")
  ) {
    return "two-pointers"
  }
  if (
    tags.includes("sliding-window") ||
    title.includes("sliding") ||
    title.includes("substring") ||
    title.includes("window")
  ) {
    return "sliding-window"
  }
  if (tags.includes("stack") || title.includes("parentheses") || title.includes("stack")) {
    return "stack"
  }
  if (
    tags.includes("binary-search") ||
    title.includes("binary search") ||
    title.includes("rotated")
  ) {
    return "binary-search"
  }
  if (
    tags.includes("linked-list") ||
    title.includes("linked list") ||
    title.includes("lru cache")
  ) {
    return "linked-list"
  }
  if (
    tags.includes("tree") ||
    tags.includes("binary-tree") ||
    title.includes("tree") ||
    title.includes("bst")
  ) {
    return "trees"
  }
  if (tags.includes("trie") || title.includes("trie") || title.includes("prefix")) {
    return "trie"
  }
  if (
    tags.includes("heap") ||
    tags.includes("priority-queue") ||
    title.includes("kth largest") ||
    title.includes("top k")
  ) {
    return "heap"
  }
  if (
    tags.includes("backtracking") ||
    title.includes("permutation") ||
    title.includes("combination") ||
    title.includes("subsets")
  ) {
    return "backtracking"
  }
  if (
    tags.includes("graph") ||
    tags.includes("bfs") ||
    tags.includes("dfs") ||
    title.includes("island") ||
    title.includes("course schedule")
  ) {
    return "graphs"
  }
  if (
    tags.includes("dynamic-programming") ||
    tags.includes("dp") ||
    title.includes("climbing stairs") ||
    title.includes("coin change") ||
    title.includes("house robber")
  ) {
    return "dp-1d"
  }
  if (tags.includes("greedy") || title.includes("jump game") || title.includes("gas station")) {
    return "greedy"
  }
  if (tags.includes("interval") || title.includes("interval")) {
    return "intervals"
  }
  if (tags.includes("math") || title.includes("pow") || title.includes("sqrt")) {
    return "math"
  }
  if (tags.includes("bit") || title.includes("single number") || title.includes("counting bits")) {
    return "bit-manipulation"
  }
  if (tags.includes("matrix") || title.includes("rotate image") || title.includes("spiral")) {
    return "matrix"
  }

  return "arrays-hashing"
}

export function ProblemPanel({ scenario, onFileSelect }: ProblemPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Default to showing analysis for DSA problems
  const [showAnalysis, setShowAnalysis] = useState(scenario.type === "dsa")
  // Collapsible optimal approach section - collapsed by default to not give away solution
  const [showOptimalApproach, setShowOptimalApproach] = useState(false)
  const {
    isInterviewStarted,
    elapsedTime,
    revealedHints,
    workspaceContext,
    setWorkspaceContext,
    realInterviewMode,
  } = useInterviewStore(
    useShallow((state) => ({
      isInterviewStarted: state.isInterviewStarted,
      elapsedTime: state.elapsedTime,
      revealedHints: state.revealedHints,
      workspaceContext: state.workspaceContext,
      setWorkspaceContext: state.setWorkspaceContext,
      realInterviewMode: state.realInterviewMode,
    }))
  )

  const hints = (scenario as any).hints || []

  // Reset visibility states when scenario changes
  useEffect(() => {
    setShowAnalysis(scenario.type === "dsa")
    setShowOptimalApproach(false) // Always start collapsed
  }, [scenario.id])

  // Get pattern metadata for DSA problems
  const patternMetadata = useMemo(() => {
    const pattern = inferPattern(scenario)
    if (!pattern) return null
    return PATTERN_METADATA[pattern]
  }, [scenario])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newFiles: WorkspaceFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (
        file.type.startsWith("text/") ||
        file.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|md|txt)$/i)
      ) {
        try {
          const content = await file.text()
          if (content.length < 50000) {
            newFiles.push({
              path: file.name,
              content: content,
            })
          }
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error)
        }
      }
    }

    if (newFiles.length > 0) {
      setWorkspaceContext([...workspaceContext, ...newFiles])
      toast.success(`Added ${newFiles.length} file(s) to workspace context`)
    }
  }

  return (
    <Card className="glass-effect flex h-full flex-col overflow-hidden border-gray-700 bg-gray-900/50">
      {/* Enhanced Header with Title and Difficulty */}
      <CardHeader className="flex-shrink-0 border-b border-gray-700/50 pb-3">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#c4703f]" />
            <span className="truncate text-base font-semibold">{scenario.title}</span>
          </div>
          <Badge
            className={`flex-shrink-0 text-xs ${
              scenario.difficulty === "easy"
                ? "border-green-500/30 bg-green-500/20 text-green-400"
                : scenario.difficulty === "medium"
                  ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                  : "border-red-500/30 bg-red-500/20 text-red-400"
            }`}
          >
            {scenario.difficulty}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {/* Problem Description - IMPROVED: Larger font, better spacing */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#c4703f] uppercase">
            <span className="h-4 w-1 rounded-full bg-[#c4703f]"></span>
            Description
            {realInterviewMode && (scenario as any).fuzzyStatement && (
              <Badge className="border-purple-500/30 bg-purple-500/20 text-[10px] text-purple-300">
                Real Interview Mode
              </Badge>
            )}
          </h3>
          <MarkdownRenderer
            content={
              realInterviewMode && (scenario as any).fuzzyStatement
                ? (scenario as any).fuzzyStatement
                : scenario.problemStatement
            }
            className="text-[15px] leading-relaxed text-gray-200"
          />
        </div>

        {/* Examples (DSA only) - IMPROVED: Better visual hierarchy */}
        {scenario.type === "dsa" && scenario.examples && scenario.examples.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#c4703f] uppercase">
              <span className="h-4 w-1 rounded-full bg-[#c4703f]"></span>
              Examples
            </h3>
            <div className="space-y-3">
              {scenario.examples.slice(0, 2).map((ex, i) => (
                <div key={i} className="rounded-lg border border-gray-700/50 bg-gray-800/70 p-3">
                  <div className="space-y-1.5 font-mono text-sm">
                    <div className="flex items-start gap-2">
                      <span className="min-w-[60px] font-medium text-gray-500">Input:</span>
                      <code className="break-all text-green-400">{ex.input}</code>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="min-w-[60px] font-medium text-gray-500">Output:</span>
                      <code className="break-all text-blue-400">{ex.output}</code>
                    </div>
                  </div>
                  {ex.explanation && (
                    <div className="mt-2 border-t border-gray-700/50 pt-2 text-sm text-gray-400 italic">
                      {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints (DSA only) - IMPROVED: Better styling */}
        {scenario.type === "dsa" && scenario.constraints && scenario.constraints.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[#c4703f] uppercase">
              <span className="h-4 w-1 rounded-full bg-[#c4703f]"></span>
              Constraints
            </h3>
            <ul className="space-y-1.5 text-gray-300">
              {scenario.constraints.slice(0, 4).map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-[#c4703f]">•</span>
                  <code className="font-mono text-gray-300">{c}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimal Approach - Collapsible (DSA only) */}
        {scenario.type === "dsa" && (scenario as DSAScenario).optimalComplexity && (
          <div className="rounded-md border border-gray-600/60 bg-gray-800/40">
            <button
              onClick={() => setShowOptimalApproach(!showOptimalApproach)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-700/30"
            >
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-[#c4703f]"></span>
                <span className="text-sm font-medium text-gray-200">Target complexity</span>
              </div>
              {showOptimalApproach ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showOptimalApproach && (
              <div className="animate-in slide-in-from-top-2 px-3 pt-0.5 pb-3 duration-200">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                    <code className="font-mono text-[#c4703f]">
                      {(scenario as DSAScenario).optimalComplexity.time}
                    </code>
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <HardDrive className="h-3.5 w-3.5 text-gray-500" />
                    <code className="font-mono text-[#c4703f]">
                      {(scenario as DSAScenario).optimalComplexity.space}
                    </code>
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Aim for this before checking hints.</p>
              </div>
            )}
          </div>
        )}

        {/* Pattern Analysis (DSA only) */}
        {scenario.type === "dsa" && patternMetadata && (
          <div className="mt-3 border-t border-gray-700 pt-3">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="mb-2 flex w-full items-center justify-between font-semibold text-white transition-colors hover:text-[#c4703f]"
            >
              <span className="flex items-center gap-1.5 text-xs">
                <BookOpen className="h-3 w-3 text-[#c4703f]" />
                Pattern Analysis
                <Badge className="border-[#c4703f]/50 bg-[#c4703f]/20 px-1.5 text-[10px] text-[#c4703f]">
                  {patternMetadata.name}
                </Badge>
              </span>
              {showAnalysis ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showAnalysis && (
              <div className="animate-in slide-in-from-top-2 space-y-3 duration-200">
                {/* Pattern Description */}
                <div className="rounded-lg border border-[#c4703f]/30 bg-[#c4703f]/10 p-2">
                  <p className="text-xs leading-relaxed text-gray-300">
                    {patternMetadata.description}
                  </p>
                </div>

                {/* Key Techniques */}
                <div>
                  <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-400">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    Key Techniques to Consider
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {patternMetadata.keyTechniques.map((tech, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-300"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Expected Complexity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-green-500/20 bg-green-500/10 p-2">
                    <h4 className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-400">
                      <Clock className="h-3 w-3 text-green-400" />
                      Time Complexity
                    </h4>
                    <div className="space-y-0.5">
                      {patternMetadata.timeComplexityHints.map((hint, i) => (
                        <p key={i} className="text-xs text-green-300">
                          {hint}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border border-blue-500/20 bg-blue-500/10 p-2">
                    <h4 className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-400">
                      <HardDrive className="h-3 w-3 text-blue-400" />
                      Space Complexity
                    </h4>
                    <div className="space-y-0.5">
                      {patternMetadata.spaceComplexityHints.map((hint, i) => (
                        <p key={i} className="text-xs text-blue-300">
                          {hint}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Common Questions for this Pattern */}
                {patternMetadata.commonQuestions && patternMetadata.commonQuestions.length > 0 && (
                  <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-2">
                    <h4 className="mb-1.5 text-xs font-medium text-purple-300">
                      Similar Problems to Practice
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {patternMetadata.commonQuestions.slice(0, 4).map((q, i) => (
                        <span
                          key={i}
                          className="rounded bg-gray-800/50 px-1.5 py-0.5 text-xs text-gray-300"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What to Expect from Interviewer */}
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
                  <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-orange-300">
                    <AlertCircle className="h-3 w-3" />
                    Expect These Follow-up Questions
                  </h4>
                  <ul className="space-y-1">
                    {patternMetadata.interviewerFollowUps.map((q, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                        <span className="flex-shrink-0 text-orange-400">{i + 1}.</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hints Section */}
        {isInterviewStarted && hints.length > 0 && (
          <div className="mt-3 border-t border-gray-700 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center space-x-1 text-xs font-semibold text-white">
                <Lightbulb className="h-3 w-3 text-yellow-400" />
                <span>
                  Hints ({revealedHints}/{hints.length})
                </span>
              </h3>
              {revealedHints < hints.length && (
                <span className="text-xs text-gray-400">
                  Next in {Math.ceil((180 - (elapsedTime % 180)) / 60)}m
                </span>
              )}
            </div>
            {revealedHints > 0 ? (
              <div className="space-y-2">
                {hints.slice(0, revealedHints).map((hint: string, i: number) => (
                  <div key={i} className="rounded border border-yellow-500/20 bg-yellow-500/10 p-2">
                    <p className="text-xs leading-relaxed text-yellow-200">
                      <span className="font-semibold">Hint {i + 1}:</span> {hint}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Hints will unlock every 3 minutes as you work on the problem
              </p>
            )}
          </div>
        )}

        {/* Workspace Files Section - Only show for non-DSA scenarios */}
        {scenario.type !== "dsa" && (
          <div className="mt-3 border-t border-gray-700 pt-3">
            <h3 className="mb-2 font-semibold text-white">Workspace Files</h3>
            {scenario.type === "bugfix" && workspaceContext.length > 0 ? (
              <div className="mb-2">
                <p className="mb-2 text-xs text-blue-400">
                  <Code className="mr-1 mb-0.5 inline-block h-3 w-3" />
                  Your codebase files are available as tabs in the code editor.
                </p>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.json,.md,.txt,text/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload workspace files"
                  id="workspace-file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="h-7 w-full border-gray-600 bg-transparent text-xs text-gray-300 hover:bg-gray-800"
                  aria-label="Upload code files to workspace"
                >
                  <Code className="mr-1 h-3 w-3" aria-hidden="true" />
                  Upload Files
                </Button>
                {workspaceContext.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {workspaceContext.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => onFileSelect(file)}
                        className="w-full cursor-pointer rounded bg-gray-800/30 px-2 py-1 text-left text-xs text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-blue-400"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Code className="h-3 w-3 flex-shrink-0" />
                          {file.path}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
