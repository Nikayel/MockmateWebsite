"use client"

import React, { memo, useMemo, useCallback, useEffect, useState } from "react"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { useTheme } from "next-themes"
import { javascript } from "@codemirror/lang-javascript"
import { EditorView, keymap } from "@codemirror/view"
import { Extension, Prec } from "@codemirror/state"
import { indentUnit, syntaxHighlighting } from "@codemirror/language"
import { classHighlighter } from "@lezer/highlight"
import { insertNewlineAndIndent, indentMore, indentLess } from "@codemirror/commands"
import { darkTheme, lightTheme } from "./editor-theme"

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
  /**
   * Grow the editor to fit its content instead of using a fixed `height`. The editor sizes to the
   * code between `minHeight` and `maxHeight`, and only scrolls internally once content exceeds
   * `maxHeight`. Set this (or either bound) whenever hiding trailing lines behind a short fixed box
   * would be wrong — read-only worked examples, reference solutions, and starter code that varies in
   * length. `height` is ignored when this is on.
   */
  autoHeight?: boolean
  minHeight?: string | number
  maxHeight?: string | number
  readOnly?: boolean
  // Support both CodeMirror style ("dark"/"light") and Monaco style ("vs-dark"/"vs-light"/"hc-black")
  theme?: "dark" | "light" | "vs-dark" | "vs-light" | "hc-black"
  className?: string
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
      autoHeight = false,
      minHeight,
      maxHeight,
      readOnly = false,
      theme,
      className = "",
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
        loader()
          .then((ext) => {
            setLoadedLangExt(ext)
          })
          .catch((err) => {
            console.warn(`Failed to load language extension for ${lang}:`, err)
            setLoadedLangExt(null)
          })
      } else {
        // Unknown language, no extension
        setLoadedLangExt(null)
      }
    }, [language])

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

      // Chrome and syntax colors share the workspace roles.
      exts.push(isDarkTheme ? darkTheme : lightTheme, calmSyntax)

      // In auto-height mode, neutralize the base themes' `height: 100%` so the editor sizes to its
      // content (capped by @uiw's `maxHeight`) instead of collapsing to its parent. Highest precedence
      // so it wins over the theme rule above.
      if (autoHeight || minHeight !== undefined || maxHeight !== undefined) {
        exts.push(Prec.highest(EditorView.theme({ "&": { height: "auto" } })))
      }

      return exts
    }, [loadedLangExt, indentSize, isDarkTheme, autoHeight, minHeight, maxHeight])

    // Handle value changes
    const handleChange = useCallback(
      (val: string) => {
        if (onChange) {
          onChange(val)
        }
      },
      [onChange]
    )

    // Convert a height-like value to a CSS string.
    const toCss = (v: string | number | undefined): string | undefined =>
      v === undefined ? undefined : typeof v === "number" ? `${v}px` : v

    // Auto-height when explicitly requested, or implied by either bound. In that mode the wrapper
    // does not impose a fixed height; CodeMirror grows to content and scrolls only past `maxHeight`.
    const isAuto = autoHeight || minHeight !== undefined || maxHeight !== undefined
    const cssHeight = toCss(height)

    return (
      <div
        style={{
          ...(isAuto ? {} : { height: cssHeight }),
          width: "100%",
        }}
        className={className}
      >
        <CodeMirror
          ref={editorRef}
          value={value}
          height={isAuto ? undefined : "100%"}
          minHeight={isAuto ? toCss(minHeight) : undefined}
          maxHeight={isAuto ? toCss(maxHeight) : undefined}
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
