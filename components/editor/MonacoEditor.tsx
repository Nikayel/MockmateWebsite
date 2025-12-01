"use client"

import React, { useEffect, useRef, useCallback, useState, Component, ReactNode } from "react"
import dynamic from "next/dynamic"

// Types for Monaco Editor
export interface MonacoEditorProps {
  value: string
  onChange?: (value: string, event?: any) => void
  language: string
  height?: string | number
  readOnly?: boolean
  theme?: "vs-dark" | "vs-light" | "hc-black"
  options?: Record<string, any>
  onMount?: (editor: any, monaco: any) => void
  className?: string
  uniqueKey?: string // For forcing remount
  minimal?: boolean // Use minimal config for performance
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
const EditorLoading = () => (
  <div className="flex items-center justify-center h-full bg-gray-900">
    <div className="flex flex-col items-center gap-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]" />
      <span className="text-gray-400 text-sm">Loading editor...</span>
    </div>
  </div>
)

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <EditorLoading />,
})

// Default editor options for interview context
const DEFAULT_OPTIONS = {
  // Layout
  automaticLayout: true,
  scrollBeyondLastLine: false,

  // Minimize UI elements
  minimap: { enabled: false },
  lineNumbers: "on" as const,
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 0,
  glyphMargin: false,
  folding: false,
  foldingHighlight: false,
  showFoldingControls: "never" as const,
  renderLineHighlight: "none" as const,
  renderWhitespace: "none" as const,
  renderLineHighlightOnlyWhenFocus: true,

  // Disable features for cleaner experience
  contextmenu: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: "off" as const,
  tabCompletion: "off" as const,
  wordBasedSuggestions: "off" as const,
  parameterHints: { enabled: false },
  hover: { enabled: false },
  links: false,
  colorDecorators: false,
  codeLens: false,
  occurrencesHighlight: "off" as const,
  selectionHighlight: false,
  matchBrackets: "never" as const,

  // Styling
  fontSize: 13,
  lineHeight: 21,
  letterSpacing: 0.5,
  tabSize: 2,
  fontLigatures: false,

  // Padding and layout
  padding: { top: 8, bottom: 8 },
  fixedOverflowWidgets: true,

  // Scrollbar
  scrollbar: {
    vertical: "auto" as const,
    horizontal: "auto" as const,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,

  // Find widget
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: "never" as const,
    seedSearchStringFromSelection: "never" as const,
  },
}

// Read-only options (for code viewers)
const READONLY_OPTIONS = {
  ...DEFAULT_OPTIONS,
  readOnly: true,
  minimap: { enabled: true },
  renderLineHighlight: "all" as const,
  wordWrap: "on" as const,
}

// Minimal options for performance-critical situations
const MINIMAL_OPTIONS = {
  ...DEFAULT_OPTIONS,
  scrollbar: { vertical: "hidden" as const, horizontal: "hidden" as const, handleMouseWheel: true },
}

export function MonacoEditor({
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
  const editorRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  // Build final options
  const baseOptions = readOnly ? READONLY_OPTIONS : (minimal ? MINIMAL_OPTIONS : DEFAULT_OPTIONS)
  const finalOptions = {
    ...baseOptions,
    readOnly,
    ...options,
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          // Get the model before disposing
          const model = editorRef.current.getModel()
          editorRef.current.dispose()

          // Dispose the model if it exists
          if (model && !model.isDisposed()) {
            model.dispose()
          }
        } catch (e) {
          console.warn("Error disposing Monaco editor:", e)
        }
        editorRef.current = null
      }

      // Clean up orphaned models
      if (typeof window !== "undefined" && (window as any).monaco?.editor) {
        try {
          const models = (window as any).monaco.editor.getModels()
          models.forEach((model: any) => {
            try {
              // Only dispose models that are not attached to any editor
              if (!model.isDisposed() && model.getAttachedEditorCount?.() === 0) {
                model.dispose()
              }
            } catch (e) {
              // Model may already be disposed
            }
          })
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  // Handle editor mount
  const handleEditorMount = useCallback(
    (editor: any, monaco: any) => {
      // Dispose old reference if exists
      if (editorRef.current && editorRef.current !== editor) {
        try {
          editorRef.current.dispose()
        } catch (e) {
          // Editor may already be disposed
        }
      }

      editorRef.current = editor
      setIsReady(true)

      // Clean up orphaned models (except current one)
      const currentModel = editor.getModel()
      const allModels = monaco.editor.getModels()
      allModels.forEach((model: any) => {
        if (model !== currentModel && !model.isDisposed()) {
          try {
            model.dispose()
          } catch (e) {
            // Model may already be disposed
          }
        }
      })

      // Call user's onMount callback
      onMount?.(editor, monaco)
    },
    [onMount]
  )

  // Handle onChange with error catching
  const handleChange = useCallback(
    (newValue: string | undefined, event: any) => {
      if (!onChange) return

      try {
        onChange(newValue || "", event)
      } catch (e) {
        console.error("Error in onChange handler:", e)
      }
    },
    [onChange]
  )

  // Generate unique key for remounting
  const editorKey = uniqueKey || `monaco-${language}`

  return (
    <MonacoErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 p-4">
          <div className="text-red-400 mb-2">Editor failed to load</div>
          <div className="text-xs">Please refresh the page</div>
        </div>
      }
    >
      <div className={`monaco-editor-wrapper ${className}`} style={{ height }}>
        <Editor
          key={editorKey}
          height="100%"
          language={language}
          value={value}
          theme={theme}
          onMount={handleEditorMount}
          onChange={handleChange}
          options={finalOptions}
        />
      </div>
    </MonacoErrorBoundary>
  )
}

// Export error boundary for external use
export { MonacoErrorBoundary }

// Export option presets
export const EDITOR_OPTIONS = {
  default: DEFAULT_OPTIONS,
  readonly: READONLY_OPTIONS,
  minimal: MINIMAL_OPTIONS,
}
