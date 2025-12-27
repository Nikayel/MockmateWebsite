"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MDXContentProps {
  content: string
}

export function MDXContent({ content }: MDXContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom rendering for code blocks
        code({ className, children, ...props }) {
          const isInline = !className
          if (isInline) {
            return (
              <code className="text-accent bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            )
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
        // Custom table styling
        table({ children }) {
          return (
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">{children}</table>
            </div>
          )
        },
        // Styled links
        a({ href, children }) {
          const isInternal = href?.startsWith("/")
          return (
            <a
              href={href}
              className="text-accent hover:underline"
              {...(!isInternal && { target: "_blank", rel: "noopener noreferrer" })}
            >
              {children}
            </a>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
