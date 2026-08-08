import type { ReactNode } from "react"

import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

/**
 * The title carried the brand while the root layout's `title.template` was also appending it, so
 * this page rendered as "Python Executor — CodeSparring | CodeSparring". The brand belongs to the
 * template alone.
 *
 * The canonical is new: this page is now submitted in `app/sitemap.ts`, and a submitted URL that
 * declares no canonical of its own is the same defect the sample pages had.
 */
export const metadata = canonicalPageMetadata({
  path: "/python-executor",
  title: "Python Executor",
  description: "A free, open Python scratchpad — write and run any code, right in your browser.",
})

export default function PythonExecutorLayout({ children }: { children: ReactNode }) {
  return children
}
