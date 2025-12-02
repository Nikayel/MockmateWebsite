"use client"

import React, { useEffect, useRef, useCallback, useState, Component, ReactNode, memo } from "react"
import dynamic from "next/dynamic"
import type { editor as MonacoEditorType } from "monaco-editor"

// Types for Monaco Editor
export interface MonacoEditorProps {
  value: string
  onChange?: (value: string, event?: any) => void
  language: string
  height?: string | number
  readOnly?: boolean
  theme?: "vs-dark" | "vs-light" | "hc-black"
  options?: Record<string, any>
  onMount?: (editor: MonacoEditorType.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => void
  className?: string
  uniqueKey?: string
  minimal?: boolean
}

// Error Boundary for Monaco Editor
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class MonacoErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Monaco Editor Error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 p-4">
          <div className="text-red-400 mb-2">Editor failed to load</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Loading component
const EditorLoading = memo(() => (
  <div className="flex items-center justify-center h-full bg-gray-900 min-h-[200px]">
    <div className="flex flex-col items-center gap-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]" />
      <span className="text-gray-400 text-sm">Loading editor...</span>
    </div>
  </div>
))
EditorLoading.displayName = "EditorLoading"

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorLoading />,
})

// Default editor options for interview context - optimized for performance
const DEFAULT_OPTIONS: MonacoEditorType.IStandaloneEditorConstructionOptions = {
  // Layout
  automaticLayout: true,
  scrollBeyondLastLine: false,

  // Minimize UI elements
  minimap: { enabled: false },
  lineNumbers: "on",
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 0,
  glyphMargin: false,
  folding: false,
  foldingHighlight: false,
  showFoldingControls: "never",
  renderLineHighlight: "none",
  renderWhitespace: "none",
  renderLineHighlightOnlyWhenFocus: true,

  // Disable features for cleaner experience and better performance
  contextmenu: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  wordBasedSuggestions: "off",
  parameterHints: { enabled: false },
  hover: { enabled: false },
  links: false,
  colorDecorators: false,
  codeLens: false,
  occurrencesHighlight: "off",
  selectionHighlight: false,
  matchBrackets: "never",

  // Styling
  fontSize: 13,
  lineHeight: 21,
  letterSpacing: 0.5,
  tabSize: 2,
  fontLigatures: false,

  // Padding and layout
  padding: { top: 8, bottom: 8 },
  fixedOverflowWidgets: true,

  // Scrollbar - simplified for better performance
  scrollbar: {
    vertical: "auto",
    horizontal: "auto",
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false,
  },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,

  // Find widget
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: "never",
    seedSearchStringFromSelection: "never",
  },

  // Performance optimizations
  renderValidationDecorations: "off",
  accessibilitySupport: "off",
  cursorBlinking: "solid",
  cursorSmoothCaretAnimation: "off",
  smoothScrolling: false,
}

// Read-only options (for code viewers)
const READONLY_OPTIONS: MonacoEditorType.IStandaloneEditorConstructionOptions = {
  ...DEFAULT_OPTIONS,
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: true, maxColumn: 80 },
  renderLineHighlight: "all",
  wordWrap: "on",
  scrollbar: {
    ...DEFAULT_OPTIONS.scrollbar,
    alwaysConsumeMouseWheel: false,
  },
}

// Minimal options for performance-critical situations
const MINIMAL_OPTIONS: MonacoEditorType.IStandaloneEditorConstructionOptions = {
  ...DEFAULT_OPTIONS,
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
    handleMouseWheel: true,
    useShadows: false,
  },
  renderLineHighlight: "none",
}

// Track all editor instances globally for cleanup
const editorRegistry = new Set<MonacoEditorType.IStandaloneCodeEditor>()

// Cleanup all orphaned models - call this periodically or on navigation
export function cleanupOrphanedModels(): void {
  if (typeof window === "undefined") return

  const monaco = (window as any).monaco
  if (!monaco?.editor) return

  try {
    const models = monaco.editor.getModels()
    const activeEditors = Array.from(editorRegistry)
    const activeModels = new Set(
      activeEditors
        .filter(e => !e.getModel()?.isDisposed?.())
        .map(e => e.getModel())
        .filter(Boolean)
    )

    models.forEach((model: any) => {
      try {
        if (!model.isDisposed?.() && !activeModels.has(model)) {
          model.dispose()
        }
      } catch {
        // Ignore disposal errors
      }
    })
  } catch {
    // Ignore cleanup errors
  }
}

// Inner editor component
function MonacoEditorInner({
  value,
  onChange,
  language,
  height = "100%",
  readOnly = false,
  theme = "vs-dark",
  options = {},
  onMount,
  className = "",
  uniqueKey,
  minimal = false,
}: MonacoEditorProps) {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const [isReady, setIsReady] = useState(false)

  // Build final options
  const baseOptions = readOnly ? READONLY_OPTIONS : (minimal ? MINIMAL_OPTIONS : DEFAULT_OPTIONS)
  const finalOptions = {
    ...baseOptions,
    readOnly,
    domReadOnly: readOnly,
    ...options,
  }

  // Convert height to CSS value
  const cssHeight = typeof height === "number" ? `${height}px` : height

  // Comprehensive cleanup function
  const cleanupEditor = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    try {
      // Remove from registry
      editorRegistry.delete(editor)

      // Get model before disposal
      const model = editor.getModel()

      // Dispose editor first
      editor.dispose()

      // Then dispose model if it exists and isn't already disposed
      if (model && !model.isDisposed?.()) {
        model.dispose()
      }
    } catch (e) {
      console.warn("Error during Monaco editor cleanup:", e)
    } finally {
      editorRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cleanupEditor()

      // Schedule orphaned model cleanup
      requestAnimationFrame(() => {
        cleanupOrphanedModels()
      })
    }
  }, [cleanupEditor])

  // Handle editor mount
  const handleEditorMount = useCallback(
    (editor: MonacoEditorType.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      if (!mountedRef.current) {
        // Component unmounted before editor mounted - dispose immediately
        try {
          const model = editor.getModel()
          editor.dispose()
          model?.dispose?.()
        } catch {
          // Ignore
        }
        return
      }

      // Clean up previous editor if it exists (shouldn't happen, but safety check)
      if (editorRef.current && editorRef.current !== editor) {
        cleanupEditor()
      }

      editorRef.current = editor
      monacoRef.current = monaco

      // Add to registry for tracking
      editorRegistry.add(editor)

      // Clean up orphaned models
      try {
        const currentModel = editor.getModel()
        const allModels = monaco.editor.getModels()

        allModels.forEach((model) => {
          if (model !== currentModel && !model.isDisposed?.()) {
            // Check if model is used by any registered editor
            const isUsed = Array.from(editorRegistry).some(
              e => e.getModel() === model
            )
            if (!isUsed) {
              try {
                model.dispose()
              } catch {
                // Ignore
              }
            }
          }
        })
      } catch {
        // Ignore cleanup errors
      }

      setIsReady(true)

      // Call user's onMount callback
      onMount?.(editor, monaco)
    },
    [onMount, cleanupEditor]
  )

  // Handle onChange with error catching
  const handleChange = useCallback(
    (newValue: string | undefined, event: any) => {
      if (!onChange || !mountedRef.current) return

      try {
        onChange(newValue || "", event)
      } catch (e) {
        console.error("Error in Monaco onChange handler:", e)
      }
    },
    [onChange]
  )

  // Generate stable key for the editor
  const editorKey = uniqueKey || `monaco-${language}`

  return (
    <div
      ref={containerRef}
      className={`monaco-editor-container ${className}`}
      style={{
        height: cssHeight,
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Editor
        key={editorKey}
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme={theme}
        onMount={handleEditorMount}
        onChange={handleChange}
        options={finalOptions}
        loading={<EditorLoading />}
      />
    </div>
  )
}

// Memoized wrapper to prevent unnecessary re-renders
export const MonacoEditor = memo(function MonacoEditorWrapper(props: MonacoEditorProps) {
  return (
    <MonacoErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 p-4 min-h-[200px]">
          <div className="text-red-400 mb-2">Editor failed to load</div>
          <div className="text-xs">Please refresh the page</div>
        </div>
      }
    >
      <MonacoEditorInner {...props} />
    </MonacoErrorBoundary>
  )
})

// Export error boundary for external use
export { MonacoErrorBoundary }

// Export option presets
export const EDITOR_OPTIONS = {
  default: DEFAULT_OPTIONS,
  readonly: READONLY_OPTIONS,
  minimal: MINIMAL_OPTIONS,
}
