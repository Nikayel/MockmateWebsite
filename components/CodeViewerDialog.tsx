"use client"

import React, { useEffect, memo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MonacoEditor, cleanupOrphanedModels } from "@/components/editor"

interface CodeViewerDialogProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  content: string
  language?: string
  problemId?: string
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

function CodeViewerDialogInner({
  isOpen,
  onClose,
  fileName,
  content,
  language,
  problemId,
}: CodeViewerDialogProps) {
  const editorLanguage = language || getLanguageFromFileName(fileName)

  // Determine initial content based on problem type
  const [editorContent, setEditorContent] = React.useState(() => {
    if (problemId === 'two-sum') {
      return `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Write your solution here
};`
    }
    return content
  })

  // Update content when prop changes
  useEffect(() => {
    if (problemId !== 'two-sum') {
      setEditorContent(content)
    }
  }, [content, problemId])

  // Handle content changes
  const handleEditorChange = useCallback((value: string) => {
    if (problemId === 'two-sum') {
      // Ensure the function name remains 'twoSum'
      const fixedValue = value.replace(/function\s+twoSum\w*\s*\(/g, 'function twoSum(')
      setEditorContent(fixedValue)
    } else {
      setEditorContent(value)
    }
  }, [problemId])

  // Cleanup Monaco editor models on unmount
  useEffect(() => {
    return () => {
      // Schedule cleanup after unmount
      requestAnimationFrame(() => {
        cleanupOrphanedModels()
      })
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span className="text-blue-400">📄</span>
            {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden editor-wrapper min-h-0">
            <MonacoEditor
              uniqueKey={`code-viewer-dialog-${fileName}-${problemId || 'default'}`}
              height="100%"
              language={editorLanguage}
              value={editorContent}
              onChange={handleEditorChange}
              readOnly
              options={{
                wordWrap: "on",
                padding: { top: 10, bottom: 10 },
                renderLineHighlight: "all",
                minimap: { enabled: true, maxColumn: 80 },
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-gray-400 p-3 border-t border-gray-700 bg-gray-800 flex-shrink-0">
            <span>Language: {editorLanguage}</span>
            <span>{editorContent.split('\n').length} lines</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const CodeViewerDialog = memo(CodeViewerDialogInner)
