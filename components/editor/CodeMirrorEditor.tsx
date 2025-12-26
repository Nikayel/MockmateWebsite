"use client"

import React, { memo, useMemo, useCallback, useEffect, useState } from "react"
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
  // New: Support calm mode for reduced visual stress
  calmMode?: boolean
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

/*
 * Research-Backed Editor Themes
 *
 * Key improvements based on cognitive load research:
 * 1. Editor background is LIGHTER than app background (reduces "cave effect")
 * 2. Calmer selection colors (40% desaturated cyan)
 * 3. Softer contrast for reduced eye strain
 * 4. Warm undertones in dark mode
 *
 * Sources: NN/G Dark Mode Study, ACM Eye Tracking 2025
 */

// Dark theme - Calmer, research-backed colors
const customDarkTheme = EditorView.theme({
  "&": {
    // Lighter than app background (#1c1c1e) for better depth perception
    backgroundColor: "#222228",
    color: "#d8d8dc",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#e8e8e8",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    fontSize: "14px",
    lineHeight: "22px",
    padding: "8px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#e8e8e8",
    borderLeftWidth: "2px",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  ".cm-gutters": {
    backgroundColor: "#252530",
    color: "#707080",
    border: "none",
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
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
  // Calmer selection - 40% desaturated cyan
  ".cm-selectionBackground": {
    backgroundColor: "rgba(95, 180, 217, 0.18) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(95, 180, 217, 0.25) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(95, 180, 217, 0.25)",
    outline: "none",
  },
  // Calmer search highlights
  ".cm-searchMatch": {
    backgroundColor: "rgba(95, 217, 154, 0.2)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "rgba(95, 180, 217, 0.35)",
  },
})

// Calm mode dark theme - Even more muted for anxiety reduction
const calmDarkTheme = EditorView.theme({
  "&": {
    // Slight blue tint for relaxation
    backgroundColor: "#202028",
    color: "#d0d0d8",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#c0c0c8",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    fontSize: "14px",
    lineHeight: "24px", // Slightly more line height for readability
    padding: "10px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#a0a0b0",
    borderLeftWidth: "2px",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "rgba(122, 184, 204, 0.04)",
  },
  ".cm-gutters": {
    backgroundColor: "#1a1a22",
    color: "#606070",
    border: "none",
    borderRight: "1px solid rgba(255, 255, 255, 0.04)",
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
  // Very muted selection for minimal visual stimulation
  ".cm-selectionBackground": {
    backgroundColor: "rgba(122, 184, 204, 0.12) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(122, 184, 204, 0.18) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(122, 184, 204, 0.15)",
    outline: "none",
  },
})

// Light theme - Reduced glare with off-white background
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#fafafa",
    color: "#1a1a1e",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#1a1a1e",
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    fontSize: "14px",
    lineHeight: "22px",
    padding: "8px 0",
  },
  ".cm-cursor": {
    borderLeftColor: "#1a1a1e",
    borderLeftWidth: "2px",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "rgba(95, 180, 217, 0.06)",
  },
  ".cm-gutters": {
    backgroundColor: "#f5f5f5",
    color: "#6e6e78",
    border: "none",
    borderRight: "1px solid rgba(0, 0, 0, 0.06)",
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
    backgroundColor: "rgba(95, 180, 217, 0.18) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(95, 180, 217, 0.25) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(95, 180, 217, 0.2)",
    outline: "none",
  },
})

// Keep legacy name for backwards compatibility
const customTheme = customDarkTheme

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
  calmMode = false,
}: CodeMirrorEditorProps) {
  const editorRef = React.useRef<ReactCodeMirrorRef>(null)

  // Detect calm mode from DOM if not explicitly passed
  const [isCalm, setIsCalm] = useState(calmMode)

  useEffect(() => {
    // Check if calm class is on document
    const checkCalmMode = () => {
      const hasCalmClass = document.documentElement.classList.contains('calm') ||
        document.body.classList.contains('calm')
      setIsCalm(calmMode || hasCalmClass)
    }

    checkCalmMode()

    // Watch for class changes
    const observer = new MutationObserver(checkCalmMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [calmMode])

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

    // Add appropriate theme based on mode
    if (isDarkTheme) {
      if (isCalm) {
        // Use calm theme for reduced visual stress
        exts.push(calmDarkTheme, oneDark)
      } else {
        // Use standard calmer dark theme
        exts.push(customDarkTheme, oneDark)
      }
    } else {
      exts.push(lightTheme)
    }

    return exts
  }, [language, isDarkTheme, isCalm])

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
        theme={isDarkTheme ? "dark" : "light"}
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
