"use client"

import { useRef, useMemo } from "react"
import { Target, Lightbulb, Code, Zap, Clock, HardDrive, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInterviewStore, type WorkspaceFile } from "@/lib/stores"
import type { Scenario, DSAScenario } from "@/lib/scenarios"
import { PATTERN_METADATA, type DSAPattern } from "@/lib/types/dsa-patterns"
import { toast } from "sonner"
import { useState } from "react"

interface ProblemPanelProps {
  scenario: Scenario
  onFileSelect: (file: WorkspaceFile) => void
}

// Infer pattern from scenario
function inferPattern(scenario: Scenario): DSAPattern | null {
  if (scenario.type !== 'dsa') return null
  const dsaScenario = scenario as DSAScenario
  if (dsaScenario.pattern) return dsaScenario.pattern

  const tags = scenario.tags.map(t => t.toLowerCase())
  const title = scenario.title.toLowerCase()

  if (tags.includes('hash-table') || tags.includes('array') || title.includes('two sum') || title.includes('contains duplicate') || title.includes('anagram')) {
    return 'arrays-hashing'
  }
  if (tags.includes('two-pointers') || title.includes('3sum') || title.includes('container') || title.includes('trapping')) {
    return 'two-pointers'
  }
  if (tags.includes('sliding-window') || title.includes('sliding') || title.includes('substring') || title.includes('window')) {
    return 'sliding-window'
  }
  if (tags.includes('stack') || title.includes('parentheses') || title.includes('stack')) {
    return 'stack'
  }
  if (tags.includes('binary-search') || title.includes('binary search') || title.includes('rotated')) {
    return 'binary-search'
  }
  if (tags.includes('linked-list') || title.includes('linked list') || title.includes('lru cache')) {
    return 'linked-list'
  }
  if (tags.includes('tree') || tags.includes('binary-tree') || title.includes('tree') || title.includes('bst')) {
    return 'trees'
  }
  if (tags.includes('trie') || title.includes('trie') || title.includes('prefix')) {
    return 'trie'
  }
  if (tags.includes('heap') || tags.includes('priority-queue') || title.includes('kth largest') || title.includes('top k')) {
    return 'heap'
  }
  if (tags.includes('backtracking') || title.includes('permutation') || title.includes('combination') || title.includes('subsets')) {
    return 'backtracking'
  }
  if (tags.includes('graph') || tags.includes('bfs') || tags.includes('dfs') || title.includes('island') || title.includes('course schedule')) {
    return 'graphs'
  }
  if (tags.includes('dynamic-programming') || tags.includes('dp') || title.includes('climbing stairs') || title.includes('coin change') || title.includes('house robber')) {
    return 'dp-1d'
  }
  if (tags.includes('greedy') || title.includes('jump game') || title.includes('gas station')) {
    return 'greedy'
  }
  if (tags.includes('interval') || title.includes('interval')) {
    return 'intervals'
  }
  if (tags.includes('math') || title.includes('pow') || title.includes('sqrt')) {
    return 'math'
  }
  if (tags.includes('bit') || title.includes('single number') || title.includes('counting bits')) {
    return 'bit-manipulation'
  }
  if (tags.includes('matrix') || title.includes('rotate image') || title.includes('spiral')) {
    return 'matrix'
  }

  return 'arrays-hashing'
}

export function ProblemPanel({ scenario, onFileSelect }: ProblemPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const {
    isInterviewStarted,
    elapsedTime,
    revealedHints,
    workspaceContext,
    setWorkspaceContext,
  } = useInterviewStore()

  const hints = (scenario as any).hints || []

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
    <Card className="bg-gray-900/50 border-gray-700 glass-effect flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-white flex items-center space-x-2 text-sm">
          <Target className="h-4 w-4 text-[#00d9ff]" />
          <span>Problem</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto text-xs sm:text-sm leading-relaxed space-y-4 pr-1">
        {/* Problem Description */}
        <div>
          <h3 className="text-white font-semibold mb-1">Description</h3>
          <p className="text-gray-300 leading-relaxed">{scenario.problemStatement}</p>
        </div>

        {/* Examples (DSA only) */}
        {scenario.type === "dsa" && scenario.examples && scenario.examples.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-1">Examples</h3>
            <div className="space-y-2">
              {scenario.examples.slice(0, 2).map((ex, i) => (
                <div key={i} className="bg-gray-800/50 p-2 rounded text-xs">
                  <div className="text-gray-400">
                    Input: <span className="text-green-400">{ex.input}</span>
                  </div>
                  <div className="text-gray-400">
                    Output: <span className="text-blue-400">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="text-gray-500 mt-1 text-xs">{ex.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints (DSA only) */}
        {scenario.type === "dsa" && scenario.constraints && scenario.constraints.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-1">Constraints</h3>
            <ul className="text-gray-300 space-y-1 list-disc list-inside">
              {scenario.constraints.slice(0, 3).map((c, i) => (
                <li key={i} className="text-xs">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pattern Analysis (DSA only) */}
        {scenario.type === "dsa" && patternMetadata && (
          <div className="border-t border-gray-700 pt-3 mt-3">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full flex items-center justify-between text-white font-semibold mb-2 hover:text-[#00d9ff] transition-colors"
            >
              <span className="flex items-center gap-1.5 text-xs">
                <BookOpen className="h-3 w-3 text-[#00d9ff]" />
                Pattern Analysis
              </span>
              {showAnalysis ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showAnalysis && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Pattern Name */}
                <div className="bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/50 text-xs">
                      {patternMetadata.name}
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {patternMetadata.description}
                  </p>
                </div>

                {/* Key Techniques */}
                <div>
                  <h4 className="text-gray-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    Key Techniques
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {patternMetadata.keyTechniques.map((tech, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs bg-gray-800/50 text-gray-300 border-gray-700"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Expected Complexity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/30 rounded p-2">
                    <h4 className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-green-400" />
                      Time Complexity
                    </h4>
                    <div className="space-y-0.5">
                      {patternMetadata.timeComplexityHints.slice(0, 2).map((hint, i) => (
                        <p key={i} className="text-xs text-green-300">{hint}</p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded p-2">
                    <h4 className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-blue-400" />
                      Space Complexity
                    </h4>
                    <div className="space-y-0.5">
                      {patternMetadata.spaceComplexityHints.slice(0, 2).map((hint, i) => (
                        <p key={i} className="text-xs text-blue-300">{hint}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* What to Expect from Interviewer */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                  <h4 className="text-orange-300 text-xs font-medium mb-1.5">
                    Common Interviewer Questions
                  </h4>
                  <ul className="space-y-1">
                    {patternMetadata.interviewerFollowUps.slice(0, 3).map((q, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                        <span className="text-orange-400 flex-shrink-0">•</span>
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
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold flex items-center space-x-1 text-xs">
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
                  <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    <p className="text-yellow-200 text-xs leading-relaxed">
                      <span className="font-semibold">Hint {i + 1}:</span> {hint}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs italic">
                Hints will unlock every 3 minutes as you work on the problem
              </p>
            )}
          </div>
        )}

        {/* Workspace Files Section */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <h3 className="text-white font-semibold mb-2">Workspace Files</h3>
          {scenario.type === "bugfix" && workspaceContext.length > 0 ? (
            <div className="mb-2">
              <p className="text-xs text-green-400 mb-2">
                ✓ {workspaceContext.length} codebase file(s) loaded automatically
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {workspaceContext.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => onFileSelect(file)}
                    className="w-full text-left text-xs text-gray-300 bg-gray-800/50 px-2 py-1 rounded border border-gray-700 hover:bg-gray-700/50 hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-blue-400 flex items-center gap-1">
                      <Code className="h-3 w-3" />
                      {file.path}
                    </div>
                  </button>
                ))}
              </div>
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
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent text-xs h-7"
              >
                <Code className="mr-1 h-3 w-3" />
                Upload Files
              </Button>
              {workspaceContext.length > 0 && (
                <div className="mt-2 space-y-1">
                  {workspaceContext.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => onFileSelect(file)}
                      className="w-full text-left text-xs text-gray-400 bg-gray-800/30 px-2 py-1 rounded hover:bg-gray-700/30 hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <div className="truncate flex items-center gap-1">
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
      </CardContent>
    </Card>
  )
}
