"use client"

import React, { useEffect } from "react"
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

export function CodeViewerSidePanel({
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
    <div className="fixed left-0 top-0 h-full w-[600px] z-[40] bg-gray-900 border-r border-gray-700 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-blue-400">📄</span>
          <h3 className="text-white font-semibold text-sm truncate">{fileName}</h3>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-700 text-gray-400 hover:text-white flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor - Using shared MonacoEditor component */}
      <div className="flex-1 overflow-hidden editor-wrapper">
        <MonacoEditor
          uniqueKey={`code-viewer-${fileName}`}
          height="100%"
          language={editorLanguage}
          value={content}
          readOnly
          options={{
            minimap: { enabled: true },
            wordWrap: "on",
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: "all",
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700 bg-gray-800/50 text-xs text-gray-400 flex-shrink-0">
        <span>Language: {editorLanguage}</span>
        <span>{content.split("\n").length} lines</span>
      </div>
    </div>
  )
}
