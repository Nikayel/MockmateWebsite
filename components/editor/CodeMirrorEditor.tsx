"use client"

import React, { memo, useMemo, useCallback } from "react"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { java } from "@codemirror/lang-java"
import { cpp } from "@codemirror/lang-cpp"
import { rust } from "@codemirror/lang-rust"
import { go } from "@codemirror/lang-go"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { Extension } from "@codemirror/state"

export interface CodeMirrorEditorProps {
  value: string
  onChange?: (value: string) => void
  language: string
  height?: string | number
  readOnly?: boolean
  // Support both CodeMirror style ("dark"/"light") and Monaco style ("vs-dark"/"vs-light"/"hc-black")
  theme?: "dark" | "light" | "vs-dark" | "vs-light" | "hc-black"
  className?: string
}

// Language extension mapping
const getLanguageExtension = (language: string): Extension | null => {
  const languageMap: Record<string, () => Extension> = {
    javascript: () => javascript({ jsx: true, typescript: false }),
    typescript: () => javascript({ jsx: true, typescript: true }),
    python: () => python(),
    java: () => java(),
    cpp: () => cpp(),
    c: () => cpp(),
    csharp: () => java(), // Use Java for C# (similar syntax highlighting)
    rust: () => rust(),
    go: () => go(),
    // File extension mappings
    js: () => javascript({ jsx: true, typescript: false }),
    jsx: () => javascript({ jsx: true, typescript: false }),
    ts: () => javascript({ jsx: true, typescript: true }),
    tsx: () => javascript({ jsx: true, typescript: true }),
    py: () => python(),
    rs: () => rust(),
  }

  const factory = languageMap[language.toLowerCase()]
  return factory ? factory() : null
}

// Custom theme to match your Neural Minimalism design
const customTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#ffffff",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    fontSize: "14px",
    lineHeight: "22px",
    padding: "8px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#ffffff",
    borderLeftWidth: "2px",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  ".cm-gutters": {
    backgroundColor: "#1e1e1e",
    color: "#858585",
    border: "none",
    paddingRight: "8px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "3ch",
    padding: "0 8px 0 0",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(0, 217, 255, 0.2) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(0, 217, 255, 0.3) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(0, 217, 255, 0.3)",
    outline: "none",
  },
})

// Light theme variant
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#1e1e1e",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#000000",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    fontSize: "14px",
    lineHeight: "22px",
    padding: "8px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#000000",
    borderLeftWidth: "2px",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  ".cm-gutters": {
    backgroundColor: "#f5f5f5",
    color: "#6e6e6e",
    border: "none",
    paddingRight: "8px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "3ch",
    padding: "0 8px 0 0",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(0, 100, 200, 0.2) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(0, 100, 200, 0.3) !important",
  },
})

// Base extensions for the editor
const baseExtensions: Extension[] = [
  EditorView.lineWrapping,
]

function CodeMirrorEditorComponent({
  value,
  onChange,
  language,
  height = "100%",
  readOnly = false,
  theme = "dark",
  className = "",
}: CodeMirrorEditorProps) {
  const editorRef = React.useRef<ReactCodeMirrorRef>(null)

  // Normalize theme to dark/light
  const isDarkTheme = theme === "dark" || theme === "vs-dark" || theme === "hc-black" || !theme

  // Memoize extensions to prevent unnecessary re-renders
  const extensions = useMemo(() => {
    const exts: Extension[] = [...baseExtensions]

    // Add language extension
    const langExt = getLanguageExtension(language)
    if (langExt) {
      exts.push(langExt)
    }

    // Add theme
    if (isDarkTheme) {
      exts.push(customTheme, oneDark)
    } else {
      exts.push(lightTheme)
    }

    return exts
  }, [language, isDarkTheme])

  // Handle value changes
  const handleChange = useCallback((val: string) => {
    if (onChange) {
      onChange(val)
    }
  }, [onChange])

  // Convert height to CSS string
  const cssHeight = typeof height === "number" ? `${height}px` : height

  return (
    <div
      style={{
        height: cssHeight,
        width: "100%",
      }}
      className={className}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        extensions={extensions}
        onChange={handleChange}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: !readOnly,
          highlightActiveLine: !readOnly,
          foldGutter: false,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
          tabSize: 2,
        }}
      />
    </div>
  )
}

// Export memoized component
export const CodeMirrorEditor = memo(CodeMirrorEditorComponent)

// Error boundary for the editor
export class CodeMirrorErrorBoundary extends React.Component<
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
    console.error("CodeMirror Editor Error:", error, info)
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

// Backwards compatibility exports
export const EDITOR_OPTIONS = {}
export function cleanupOrphanedModels() {
  // No-op for backwards compatibility
}
