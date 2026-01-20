"use client"

import { MarkdownRenderer } from "./MarkdownRenderer"

interface FormattedTextProps {
  children: string
  className?: string
}

/**
 * Centralized component for rendering text that may contain markdown formatting.
 * Use this for any user-facing text that could include **bold**, *italic*, lists, etc.
 *
 * This wraps MarkdownRenderer for consistent styling across the app.
 */
export function FormattedText({ children, className = "" }: FormattedTextProps) {
  return <MarkdownRenderer content={children} className={className} />
}
