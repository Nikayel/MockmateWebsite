"use client"

import React, { useEffect, memo } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonacoEditor } from "@/components/editor"

interface CodeViewerSidePanelProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  content: string
  language?: string
}

// Map file extensions to Monaco Editor language IDs
const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "cpp",
    hpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    json: "json",
    md: "markdown",
    html: "html",
    css: "css",
    scss: "scss",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
  }

  return languageMap[extension || ""] || "plaintext"
}

function CodeViewerSidePanelInner({
  isOpen,
  onClose,
  fileName,
  content,
  language,
}: CodeViewerSidePanelProps) {
  const editorLanguage = language || getLanguageFromFileName(fileName)

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop overlay - click to close (darker on mobile, subtle on desktop) */}
      <div
        className="fixed inset-0 bg-background/60 lg:bg-background/30 z-[39] backdrop-blur-sm lg:backdrop-blur-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel - Responsive widths - Pure overlay, doesn't shift content */}
      <div className="fixed left-0 top-0 h-full w-[calc(100vw-48px)] sm:w-[300px] md:w-[340px] lg:w-[380px] xl:w-[420px] 2xl:w-[460px] max-w-[460px] z-[40] bg-card border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out animate-in slide-in-from-left">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-muted/50 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-blue-400 text-sm">📄</span>
            <h3 className="text-foreground font-semibold text-xs sm:text-sm truncate">{fileName}</h3>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor - Using shared MonacoEditor component */}
        <div className="flex-1 overflow-hidden editor-wrapper min-h-0">
          <MonacoEditor
            height="100%"
            language={editorLanguage}
            value={content}
            readOnly
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-3 sm:px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground flex-shrink-0">
          <span>Language: {editorLanguage}</span>
          <span>{content.split("\n").length} lines</span>
        </div>
      </div>
    </>
  )
}

// Memoize to prevent unnecessary re-renders
export const CodeViewerSidePanel = memo(CodeViewerSidePanelInner)
