"use client"

import React, { memo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MonacoEditor } from "@/components/editor"

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

function CodeViewerDialogInner({
  isOpen,
  onClose,
  fileName,
  content,
  language,
}: CodeViewerDialogProps) {
  const editorLanguage = language || getLanguageFromFileName(fileName)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <span className="text-blue-400">📄</span>
            {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden editor-wrapper min-h-0">
            <MonacoEditor
              height="100%"
              language={editorLanguage}
              value={content}
              readOnly
            />
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground p-3 border-t border-border bg-muted flex-shrink-0">
            <span>Language: {editorLanguage}</span>
            <span>{content.split('\n').length} lines</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const CodeViewerDialog = memo(CodeViewerDialogInner)
