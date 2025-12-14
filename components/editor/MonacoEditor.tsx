"use client"

import React, { memo, useEffect, useRef } from "react"
import Editor, { OnChange, OnMount } from "@monaco-editor/react"
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

// Minimal Monaco editor component with diagnostics
// NO wrapper styling - let Monaco handle everything
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

  // Handle value changes - simple passthrough
  const handleChange: OnChange = (newValue) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue)
    }
  }

  // Handle editor mount with diagnostics
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Diagnostic logging
    if (process.env.NODE_ENV === "development") {
      console.log("[Monaco] Editor mounted successfully")
      console.log("[Monaco] Editor instance:", editor)
      console.log("[Monaco] Container:", containerRef.current)
      
      // Check for interfering elements
      const editorElement = editor.getContainerDomNode()
      console.log("[Monaco] Editor DOM element:", editorElement)
      console.log("[Monaco] Editor element position:", editorElement.getBoundingClientRect())
      
      // Check for native-edit-context
      const nativeEditContext = editorElement.querySelector(".native-edit-context") as HTMLElement
      if (nativeEditContext) {
        console.log("[Monaco] Found native-edit-context:", nativeEditContext)
        console.log("[Monaco] native-edit-context styles:", window.getComputedStyle(nativeEditContext))
        console.log("[Monaco] native-edit-context position:", nativeEditContext.getBoundingClientRect())
        console.log("[Monaco] native-edit-context pointer-events:", window.getComputedStyle(nativeEditContext).pointerEvents)
        console.log("[Monaco] native-edit-context opacity:", window.getComputedStyle(nativeEditContext).opacity)
      } else {
        console.warn("[Monaco] WARNING: native-edit-context not found!")
      }

      // Monitor cursor position changes
      editor.onDidChangeCursorPosition((e) => {
        console.log("[Monaco] Cursor position changed:", e.position)
      })

      // Monitor selection changes
      editor.onDidChangeCursorSelection((e) => {
        console.log("[Monaco] Selection changed:", e.selection)
      })

      // Check for overlaying elements
      setTimeout(() => {
        const rect = editorElement.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const elementAtPoint = document.elementFromPoint(centerX, centerY)
        console.log("[Monaco] Element at center point:", elementAtPoint)
        if (elementAtPoint && !editorElement.contains(elementAtPoint)) {
          console.warn("[Monaco] WARNING: Overlaying element detected at center:", elementAtPoint)
        }
      }, 1000)
    }

    // Focus the editor
    editor.focus()
  }

  // Convert height to CSS string
  const cssHeight = typeof height === "number" ? `${height}px` : height

  return (
    <div
      ref={containerRef}
      style={{
        height: cssHeight,
        width: "100%",
      }}
      className={className}
    >
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme={theme}
        onChange={handleChange}
        onMount={handleEditorDidMount}
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
          selectionHighlight: true,
          occurrencesHighlight: "off",
          renderWhitespace: "none",
          guides: { indentation: false },
          bracketPairColorization: { enabled: false },
          matchBrackets: "never",
          padding: { top: 8, bottom: 8 },
          cursorBlinking: "blink",
          cursorStyle: "line",
          stickyScroll: { enabled: false },
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
