import type { Metadata } from "next"
import { BlogThemeProvider } from "@/components/blog/BlogThemeProvider"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Blog - Coding Interview Tips & DSA Patterns",
  description: "Expert guides on coding interviews, DSA patterns, and tech career advice. Learn the strategies that help developers land jobs at top tech companies.",
  keywords: [
    "coding interview blog",
    "DSA patterns guide",
    "tech interview tips",
    "algorithm tutorials",
    "FAANG interview prep",
    "software engineering career",
    "leetcode solutions",
    "coding interview strategies",
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog - Coding Interview Tips & DSA Patterns | CodeSparring",
    description: "Expert guides on coding interviews, DSA patterns, and tech career advice.",
    url: "/blog",
    type: "website",
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LenisProvider>
      <BlogThemeProvider>{children}</BlogThemeProvider>
    </LenisProvider>
  )
}
