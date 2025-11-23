"use client"

import React, { useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Loading editor...</div>
    </div>
  ),
})

interface CodeViewerDialogProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  content: string
  language?: string
}

// Map file extensions to Monaco Editor language IDs
const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'cpp',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'json': 'json',
    'md': 'markdown',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
  }

  return languageMap[extension || ''] || 'plaintext'
}

export function CodeViewerDialog({
  isOpen,
  onClose,
  fileName,
  content,
  language,
}: CodeViewerDialogProps) {
  const editorLanguage = language || getLanguageFromFileName(fileName)

  // Cleanup Monaco editor models on unmount
  useEffect(() => {
    return () => {
      // Dispose any Monaco models to prevent memory leaks
      if (typeof window !== 'undefined' && (window as any).monaco?.editor) {
        const models = (window as any).monaco.editor.getModels()
        models.forEach((model: any) => {
          // Only dispose models that aren't part of the main editor
          if (model.uri.path.includes(fileName)) {
            model.dispose()
          }
        })
      }
    }
  }, [fileName])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span className="text-blue-400">📄</span>
            {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden rounded-md border border-gray-700 editor-wrapper">
          <MonacoEditor
            height="100%"
            language={editorLanguage}
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              padding: { top: 10, bottom: 10 },
              renderLineHighlight: 'all',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              // Disable all widgets to prevent leakage
              contextmenu: false,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              acceptSuggestionOnEnter: 'off',
              tabCompletion: 'off',
              wordBasedSuggestions: 'off',
              parameterHints: { enabled: false },
              hover: { enabled: false },
              links: false,
              colorDecorators: false,
              find: {
                addExtraSpaceOnTop: false,
                autoFindInSelection: 'never',
                seedSearchStringFromSelection: 'never',
              },
              occurrencesHighlight: false,
              selectionHighlight: false,
              codeLens: false,
              folding: false,
              foldingHighlight: false,
              showFoldingControls: 'never',
              matchBrackets: 'never',
            }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-700">
          <span>Language: {editorLanguage}</span>
          <span>{content.split('\n').length} lines</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
