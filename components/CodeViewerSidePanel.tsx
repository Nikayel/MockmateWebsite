"use client"

import React, { useEffect, memo } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonacoEditor } from "@/components/editor"
import { MarkdownFileView } from "@/components/editor/MarkdownFileView"

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
        className="bg-background/60 lg:bg-background/30 fixed inset-0 z-[39] backdrop-blur-sm lg:backdrop-blur-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel - Responsive widths - Pure overlay, doesn't shift content */}
      <div className="bg-card border-border animate-in slide-in-from-left fixed top-0 left-0 z-[40] flex h-full w-[calc(100vw-48px)] max-w-[460px] flex-col border-r shadow-2xl transition-transform duration-300 ease-in-out sm:w-[300px] md:w-[340px] lg:w-[380px] xl:w-[420px] 2xl:w-[460px]">
        {/* Header */}
        <div className="border-border bg-muted/50 flex flex-shrink-0 items-center justify-between border-b p-3 sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm text-blue-400">📄</span>
            <h3 className="text-foreground truncate text-xs font-semibold sm:text-sm">
              {fileName}
            </h3>
          </div>
          <Button
            onClick={onClose}
            aria-label="Close file viewer"
            variant="ghost"
            size="sm"
            className="hover:bg-muted text-muted-foreground hover:text-foreground h-7 w-7 flex-shrink-0 p-0 sm:h-8 sm:w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor - Using shared MonacoEditor component */}
        <div className="editor-wrapper min-h-0 flex-1 overflow-hidden">
          <MarkdownFileView key={fileName} fileName={fileName} content={content}>
            <MonacoEditor height="100%" language={editorLanguage} value={content} readOnly />
          </MarkdownFileView>
        </div>

        {/* Footer */}
        <div className="border-border bg-muted/50 text-muted-foreground flex flex-shrink-0 items-center justify-between border-t px-3 py-2 text-xs sm:px-4">
          <span>Language: {editorLanguage}</span>
          <span>{content.split("\n").length} lines</span>
        </div>
      </div>
    </>
  )
}

// Memoize to prevent unnecessary re-renders
export const CodeViewerSidePanel = memo(CodeViewerSidePanelInner)
