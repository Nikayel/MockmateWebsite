"use client"

import React, { memo, useMemo, useCallback, useEffect, useState } from "react"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { useTheme } from "next-themes"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView, keymap } from "@codemirror/view"
import { Extension } from "@codemirror/state"
import { indentUnit, syntaxHighlighting } from "@codemirror/language"
import { classHighlighter } from "@lezer/highlight"
import { insertNewlineAndIndent, indentMore, indentLess } from "@codemirror/commands"

// Lazy-loaded language extensions (reduces initial bundle by ~100KB)
// These are only loaded when the specific language is needed
const languageLoaders: Record<string, () => Promise<Extension>> = {
  python: async () => (await import("@codemirror/lang-python")).python(),
  py: async () => (await import("@codemirror/lang-python")).python(),
  java: async () => (await import("@codemirror/lang-java")).java(),
  cpp: async () => (await import("@codemirror/lang-cpp")).cpp(),
  c: async () => (await import("@codemirror/lang-cpp")).cpp(),
  csharp: async () => (await import("@codemirror/lang-java")).java(), // Similar syntax
  rust: async () => (await import("@codemirror/lang-rust")).rust(),
  rs: async () => (await import("@codemirror/lang-rust")).rust(),
  go: async () => (await import("@codemirror/lang-go")).go(),
  sql: async () => {
    const { sql, SQLite } = await import("@codemirror/lang-sql")
    return sql({ dialect: SQLite })
  },
}

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

// Language indentation settings
const languageIndentMap: Record<string, number> = {
  python: 4,
  py: 4,
  javascript: 2,
  typescript: 2,
  js: 2,
  jsx: 2,
  ts: 2,
  tsx: 2,
  java: 4,
  cpp: 4,
  c: 4,
  csharp: 4,
  rust: 4,
  go: 4,
  rs: 4,
  sql: 2,
}

const getIndentSize = (language: string): number => {
  return languageIndentMap[language.toLowerCase()] ?? 2
}

// Synchronous JavaScript extension (bundled with core - always available)
const getJsExtension = (language: string): Extension | null => {
  const lang = language.toLowerCase()
  if (["javascript", "js", "jsx"].includes(lang)) {
    return javascript({ jsx: true, typescript: false })
  }
  if (["typescript", "ts", "tsx"].includes(lang)) {
    return javascript({ jsx: true, typescript: true })
  }
  return null
}

/*
 * Calm, warm editor chrome (Claude-inspired). These themes set ONLY the editor
 * surface — background, gutter, cursor, selection, brackets — in the clay
 * palette. Syntax token colors are NOT set here: they come from the centralized
 * `.tok-*` CSS variables in globals.css (applied via CodeMirror's
 * classHighlighter), so highlighting is restrained, on-palette, and follows the
 * light/dark theme automatically instead of CodeMirror's default rainbow.
 */
const EDITOR_FONT = '"Fira Code", "Consolas", "Monaco", monospace'

const darkTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#1e1d1b", color: "#ece9e1", height: "100%" },
    ".cm-content": {
      caretColor: "#ece9e1",
      fontFamily: EDITOR_FONT,
      fontSize: "14px",
      lineHeight: "22px",
      padding: "8px 0",
    },
    ".cm-cursor": { borderLeftColor: "#ece9e1", borderLeftWidth: "2px" },
    ".cm-activeLine": { backgroundColor: "transparent" },
    "&.cm-focused .cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.035)" },
    ".cm-gutters": {
      backgroundColor: "#1a1917",
      color: "#6a675f",
      border: "none",
      borderRight: "1px solid rgba(255, 255, 255, 0.06)",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.035)" },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "3ch", padding: "0 8px 0 0" },
    ".cm-scroller": { overflow: "auto", fontFamily: EDITOR_FONT },
    ".cm-selectionBackground": { backgroundColor: "rgba(196, 112, 63, 0.20) !important" },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(196, 112, 63, 0.30) !important",
    },
    ".cm-matchingBracket": { backgroundColor: "rgba(196, 112, 63, 0.30)", outline: "none" },
    ".cm-searchMatch": { backgroundColor: "rgba(76, 199, 155, 0.22)" },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(196, 112, 63, 0.38)",
    },
  },
  { dark: true }
)

const lightTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#f8f7f3", color: "#292824", height: "100%" },
    ".cm-content": {
      caretColor: "#292824",
      fontFamily: EDITOR_FONT,
      fontSize: "14px",
      lineHeight: "22px",
      padding: "8px 0",
    },
    ".cm-cursor": { borderLeftColor: "#292824", borderLeftWidth: "2px" },
    ".cm-activeLine": { backgroundColor: "transparent" },
    "&.cm-focused .cm-activeLine": { backgroundColor: "rgba(196, 112, 63, 0.06)" },
    ".cm-gutters": {
      backgroundColor: "#f3f2ee",
      color: "#a8a49c",
      border: "none",
      borderRight: "1px solid rgba(0, 0, 0, 0.06)",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": { backgroundColor: "rgba(196, 112, 63, 0.06)" },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "3ch", padding: "0 8px 0 0" },
    ".cm-scroller": { overflow: "auto", fontFamily: EDITOR_FONT },
    ".cm-selectionBackground": { backgroundColor: "rgba(196, 112, 63, 0.16) !important" },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(196, 112, 63, 0.24) !important",
    },
    ".cm-matchingBracket": { backgroundColor: "rgba(196, 112, 63, 0.22)", outline: "none" },
    ".cm-searchMatch": { backgroundColor: "rgba(29, 158, 117, 0.18)" },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(196, 112, 63, 0.30)",
    },
  },
  { dark: false }
)

// Stable token classes (.tok-keyword, .tok-string, …) colored from globals.css.
const calmSyntax = syntaxHighlighting(classHighlighter)

// Base extensions for the editor
const baseExtensions: Extension[] = [EditorView.lineWrapping]

export interface CodeMirrorEditorRef {
  view: EditorView | undefined
  gotoLine: (lineNum: number) => void
}

const CodeMirrorEditorComponent = React.forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  (
    {
      value,
      onChange,
      language,
      height = "100%",
      readOnly = false,
      theme,
      className = "",
      calmMode = false,
    }: CodeMirrorEditorProps,
    ref
  ) => {
    const editorRef = React.useRef<ReactCodeMirrorRef>(null)
    // Follow the global (next-themes) theme unless a caller forces one. Stays
    // dark until mounted to avoid a hydration mismatch on the resolved theme.
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    React.useImperativeHandle(ref, () => ({
      get view() {
        return editorRef.current?.view
      },
      gotoLine: (lineNum: number) => {
        const view = editorRef.current?.view
        if (view) {
          try {
            const doc = view.state.doc
            const clampedLine = Math.max(1, Math.min(lineNum, doc.lines))
            const line = doc.line(clampedLine)
            view.dispatch({
              selection: { anchor: line.from, head: line.from },
              effects: EditorView.scrollIntoView(line.from, { y: "center" }),
            })
            view.focus()
          } catch (e) {
            console.warn("Failed to scroll to line:", e)
          }
        }
      },
    }))

    // State for lazy-loaded language extension
    const [loadedLangExt, setLoadedLangExt] = useState<Extension | null>(null)
    const [langLoading, setLangLoading] = useState(false)

    // Detect calm mode from DOM if not explicitly passed
    const [isCalm, setIsCalm] = useState(calmMode)

    // Lazy load language extension when language changes
    useEffect(() => {
      const lang = language.toLowerCase()

      // Check if it's a JS/TS language (bundled, no lazy load needed)
      const jsExt = getJsExtension(lang)
      if (jsExt) {
        setLoadedLangExt(jsExt)
        return
      }

      // Check if we have a loader for this language
      const loader = languageLoaders[lang]
      if (loader) {
        setLangLoading(true)
        loader()
          .then((ext) => {
            setLoadedLangExt(ext)
          })
          .catch((err) => {
            console.warn(`Failed to load language extension for ${lang}:`, err)
            setLoadedLangExt(null)
          })
          .finally(() => setLangLoading(false))
      } else {
        // Unknown language, no extension
        setLoadedLangExt(null)
      }
    }, [language])

    useEffect(() => {
      // Check if calm class is on document
      const checkCalmMode = () => {
        const hasCalmClass =
          document.documentElement.classList.contains("calm") ||
          document.body.classList.contains("calm")
        setIsCalm(calmMode || hasCalmClass)
      }

      checkCalmMode()

      // Watch for class changes
      const observer = new MutationObserver(checkCalmMode)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })

      return () => observer.disconnect()
    }, [calmMode])

    // Resolve the effective theme: an explicit prop wins; otherwise follow the
    // global app theme (next-themes), defaulting to dark before mount.
    const effectiveTheme = theme ?? (mounted && resolvedTheme === "light" ? "light" : "dark")
    const isDarkTheme =
      effectiveTheme === "dark" || effectiveTheme === "vs-dark" || effectiveTheme === "hc-black"

    // Get indentation size for the language
    const indentSize = getIndentSize(language)

    // Memoize extensions to prevent unnecessary re-renders
    const extensions = useMemo(() => {
      const exts: Extension[] = [...baseExtensions]

      // Add loaded language extension
      if (loadedLangExt) {
        exts.push(loadedLangExt)
      }

      // Add indentUnit extension for proper auto-indentation
      // This creates the correct number of spaces when pressing Enter
      exts.push(indentUnit.of(" ".repeat(indentSize)))

      // Add keymap for better indentation handling
      exts.push(
        keymap.of([
          // Enter key: insert newline with proper indentation
          { key: "Enter", run: insertNewlineAndIndent },
          // Tab: indent more
          { key: "Tab", run: indentMore },
          // Shift-Tab: indent less
          { key: "Shift-Tab", run: indentLess },
        ])
      )

      // Calm, on-palette surface + centralized syntax classes. Calm mode keeps
      // the same restrained theme (token colors are already low-saturation, so
      // there's no rainbow to mute); it's retained in deps for parity.
      exts.push(isDarkTheme ? darkTheme : lightTheme, calmSyntax)

      return exts
    }, [loadedLangExt, indentSize, isDarkTheme, isCalm])

    // Handle value changes
    const handleChange = useCallback(
      (val: string) => {
        if (onChange) {
          onChange(val)
        }
      },
      [onChange]
    )

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
          theme="none"
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
            // Use language-aware tabSize (Python=4, JS/TS=2, etc.)
            tabSize: indentSize,
          }}
        />
      </div>
    )
  }
)

CodeMirrorEditorComponent.displayName = "CodeMirrorEditor"

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
      return (
        this.props.fallback || (
          <div className="flex h-full items-center justify-center bg-gray-900 text-red-400">
            Editor failed to load
          </div>
        )
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
