"use client"

import { lazy, Suspense, useState, type ReactNode } from "react"
import { BookOpen, Code } from "lucide-react"
import { Button } from "@/components/ui/button"

const MarkdownFilePreview = lazy(() => import("./MarkdownFilePreview"))

interface MarkdownFileViewProps {
  fileName: string
  content: string
  children: ReactNode
  preview?: boolean
  onPreviewChange?: (preview: boolean) => void
}

/** A reading mode for repository documents; the controlled source stays untouched. */
export function MarkdownFileView({
  fileName,
  content,
  children,
  preview: controlledPreview,
  onPreviewChange,
}: MarkdownFileViewProps) {
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const preview = controlledPreview ?? previewFile === fileName
  if (!/\.(md|markdown|mdown)$/i.test(fileName)) return children

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border bg-card flex shrink-0 justify-end border-b px-2">
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground hover:bg-muted hover:text-foreground h-11 gap-2 text-xs"
          aria-pressed={preview}
          onClick={() => {
            setPreviewFile(preview ? null : fileName)
            onPreviewChange?.(!preview)
          }}
        >
          {preview ? <Code aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
          {preview ? "View source" : "Make readable"}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {preview ? (
          <Suspense
            fallback={<p className="text-muted-foreground p-6 text-sm">Opening preview…</p>}
          >
            <MarkdownFilePreview
              fileName={fileName}
              content={content}
              focusOnOpen={controlledPreview === true}
            />
          </Suspense>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
