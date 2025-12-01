"use client"

import { useRef } from "react"
import { Target, Lightbulb, Code } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useInterviewStore, type WorkspaceFile } from "@/lib/stores"
import type { Scenario } from "@/lib/scenarios"
import { toast } from "sonner"

interface ProblemPanelProps {
  scenario: Scenario
  onFileSelect: (file: WorkspaceFile) => void
}

export function ProblemPanel({ scenario, onFileSelect }: ProblemPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    isInterviewStarted,
    elapsedTime,
    revealedHints,
    workspaceContext,
    setWorkspaceContext,
  } = useInterviewStore()

  const hints = (scenario as any).hints || []

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
