"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MDXContentProps {
  content: string
  isLight?: boolean
}

export function MDXContent({ content, isLight = false }: MDXContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom rendering for code blocks
        code({ className, children, ...props }) {
          const isInline = !className
          if (isInline) {
            return (
              <code
                className={`px-1.5 py-0.5 rounded text-sm ${
                  isLight
                    ? "bg-gray-100 text-blue-600 border border-gray-200"
                    : "bg-gray-800 text-blue-400"
                }`}
                {...props}
              >
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
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return (
            <th
              className={`text-left px-4 py-3 font-medium text-sm ${
                isLight
                  ? "border-b border-gray-200 text-gray-500"
                  : "border-b border-gray-700 text-gray-400"
              }`}
            >
              {children}
            </th>
          )
        },
        td({ children }) {
          return (
            <td
              className={`px-4 py-3 ${
                isLight
                  ? "border-b border-gray-100 text-gray-600"
                  : "border-b border-gray-800 text-gray-300"
              }`}
            >
              {children}
            </td>
          )
        },
        // Styled links
        a({ href, children }) {
          const isInternal = href?.startsWith("/")
          return (
            <a
              href={href}
              className={`hover:underline ${isLight ? "text-blue-600" : "text-blue-400"}`}
              {...(!isInternal && { target: "_blank", rel: "noopener noreferrer" })}
            >
              {children}
            </a>
          )
        },
        // Headings
        h2({ children }) {
          return (
            <h2
              className={`text-2xl font-bold mt-12 mb-4 ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              {children}
            </h2>
          )
        },
        h3({ children }) {
          return (
            <h3
              className={`text-xl font-semibold mt-8 mb-3 ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              {children}
            </h3>
          )
        },
        // Paragraphs
        p({ children }) {
          return (
            <p
              className={`leading-relaxed mb-6 ${
                isLight ? "text-gray-600" : "text-gray-300"
              }`}
            >
              {children}
            </p>
          )
        },
        // Strong text
        strong({ children }) {
          return (
            <strong className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
              {children}
            </strong>
          )
        },
        // Lists
        ul({ children }) {
          return (
            <ul
              className={`list-disc list-outside ml-6 mb-6 space-y-2 ${
                isLight ? "text-gray-600" : "text-gray-300"
              }`}
            >
              {children}
            </ul>
          )
        },
        ol({ children }) {
          return (
            <ol
              className={`list-decimal list-outside ml-6 mb-6 space-y-2 ${
                isLight ? "text-gray-600" : "text-gray-300"
              }`}
            >
              {children}
            </ol>
          )
        },
        // List items
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>
        },
        // Blockquote
        blockquote({ children }) {
          return (
            <blockquote
              className={`border-l-4 pl-6 my-6 italic ${
                isLight
                  ? "border-blue-500 text-gray-600"
                  : "border-blue-400 text-gray-400"
              }`}
            >
              {children}
            </blockquote>
          )
        },
        // Pre/code blocks
        pre({ children }) {
          return (
            <pre
              className={`rounded-xl p-5 overflow-x-auto my-6 text-sm ${
                isLight
                  ? "bg-gray-900 text-gray-100"
                  : "bg-gray-900 text-gray-100 border border-gray-800"
              }`}
            >
              {children}
            </pre>
          )
        },
        // Horizontal rule
        hr() {
          return (
            <hr
              className={`my-8 ${isLight ? "border-gray-200" : "border-gray-800"}`}
            />
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
