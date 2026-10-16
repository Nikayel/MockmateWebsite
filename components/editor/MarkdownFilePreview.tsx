"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import "./markdown-file-preview.css"

interface MarkdownFilePreviewProps {
  fileName: string
  content: string
}

/** Plain GFM for repository files, without lesson-only widgets or source transformations. */
export default function MarkdownFilePreview({ fileName, content }: MarkdownFilePreviewProps) {
  return (
    <article
      aria-label={`${fileName} preview`}
      className="markdown-file-preview text-foreground mx-auto max-w-3xl p-5 sm:p-8"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          table: ({ children }) => (
            <div className="markdown-file-table">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              {...(/^https?:\/\//i.test(href ?? "") && {
                target: "_blank",
                rel: "noopener noreferrer",
              })}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
