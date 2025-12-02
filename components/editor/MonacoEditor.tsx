"use client"

import React, { useEffect, useRef, memo } from "react"
import Editor, { OnMount, OnChange } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

export interface MonacoEditorProps {
  value: string
  onChange?: (value: string) => void
  language: string
  height?: string | number
  readOnly?: boolean
  theme?: "vs-dark" | "vs-light" | "hc-black"
  className?: string
}

// Simple, clean Monaco editor component
function MonacoEditorComponent({
  value,
  onChange,
  language,
  height = "100%",
  readOnly = false,
  theme = "vs-dark",
  className = "",
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle editor mount
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Focus the editor
    editor.focus()

    // Force layout after mount
    requestAnimationFrame(() => {
      editor.layout()
    })
  }

  // Handle value changes
  const handleChange: OnChange = (newValue) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Convert height to CSS string
  const cssHeight = typeof height === "number" ? `${height}px` : height

  return (
    <div
      ref={containerRef}
      className={`monaco-wrapper ${className}`}
      style={{
        height: cssHeight,
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme={theme}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 22,
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "off",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 8,
          renderLineHighlight: readOnly ? "all" : "none",
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerBorder: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          contextmenu: false,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
          hover: { enabled: false },
          codeLens: false,
          links: false,
          colorDecorators: false,
          selectionHighlight: false,
          occurrencesHighlight: "off",
          renderWhitespace: "none",
          guides: { indentation: false },
          bracketPairColorization: { enabled: false },
          matchBrackets: "never",
          padding: { top: 12, bottom: 12 },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="text-gray-400 text-sm">Loading editor...</div>
          </div>
        }
      />
    </div>
  )
}

// Export memoized component
export const MonacoEditor = memo(MonacoEditorComponent)

// Simple error boundary
export class MonacoErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Monaco Editor Error:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-gray-900 text-red-400">
          Editor failed to load
        </div>
      )
    }
    return this.props.children
  }
}

// Export for backwards compatibility
export const EDITOR_OPTIONS = {}
export function cleanupOrphanedModels() {
  // No-op for backwards compatibility
}
