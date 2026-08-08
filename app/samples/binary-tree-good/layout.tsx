import type { ReactNode } from "react"

import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

/**
 * Metadata-only layout. See `app/samples/two-sum-excellent/layout.tsx` for why the canonical has to
 * be declared here and why it cannot live on the page.
 */
export const metadata = canonicalPageMetadata({
  path: "/samples/binary-tree-good",
  title: "Binary Tree Inorder Traversal: B+ Sample Report",
  description:
    "A graded binary tree traversal mock interview: recursive and iterative approaches, where the candidate hesitated, and the B+ feedback that resulted.",
})

export default function BinaryTreeSampleLayout({ children }: { children: ReactNode }) {
  return children
}
