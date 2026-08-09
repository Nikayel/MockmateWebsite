"use client"

import { type RefObject } from "react"
import { Code } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios"
import type { WorkspaceContextFile } from "../../_types"

interface WorkspaceFileViewerProps {
  selectedScenario: Scenario
  workspaceContext: WorkspaceContextFile[]
  fileInputRef: RefObject<HTMLInputElement | null>
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  setSelectedFile: (file: WorkspaceContextFile | null) => void
  setIsCodeViewerOpen: (open: boolean) => void
}

export function WorkspaceFileViewer({
  selectedScenario,
  workspaceContext,
  fileInputRef,
  handleFileUpload,
  setSelectedFile,
  setIsCodeViewerOpen,
}: WorkspaceFileViewerProps) {
  return (
    <div className="border-border mt-3 border-t pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-foreground font-semibold">Codebase Files</h3>
        {selectedScenario.type === "bugfix" && (
          <Badge className="border-accent/30 bg-accent/10 text-accent-strong text-xs">
            inspect in editor
          </Badge>
        )}
      </div>
      {/* Show warning for add-functionality when language has no files */}
      {selectedScenario &&
        selectedScenario.type === "add-functionality" &&
        workspaceContext.length === 0 && (
          <div className="mb-2 rounded border border-amber-400/30 bg-amber-500/10 p-2">
            <p className="text-xs text-amber-300">
              This scenario uses a prepared codebase workspace. Reload the scenario if the files do
              not appear.
            </p>
          </div>
        )}
      {selectedScenario &&
      (selectedScenario.type === "bugfix" || selectedScenario.type === "add-functionality") &&
      workspaceContext.length > 0 ? (
        <div className="mb-2">
          <p className="text-muted-foreground mb-2 text-xs">
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
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted h-8 w-full bg-transparent text-xs"
          >
            <Code className="mr-1 h-3 w-3" />
            Upload Files
          </Button>
          {workspaceContext.length > 0 && (
            <div className="mt-2 space-y-1">
              {workspaceContext.map((file) => (
                <button
                  key={file.path}
                  onClick={() => {
                    setSelectedFile(file)
                    setIsCodeViewerOpen(true)
                  }}
                  className="bg-muted/30 text-muted-foreground hover:bg-muted/30 hover:text-foreground w-full cursor-pointer rounded px-2 py-1 text-left text-xs transition-colors"
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
  )
}
