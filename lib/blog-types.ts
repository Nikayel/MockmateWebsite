export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  author: string
  readTime: string
  category: "dsa" | "faang" | "system-design" | "career" | "guides"
  tags: string[]
  featured?: boolean
  image?: string
}

export interface BlogPost extends BlogPostMeta {
  content: string
}

// Category metadata
export const categoryLabels: Record<BlogPostMeta["category"], string> = {
  dsa: "Data Structures & Algorithms",
  faang: "FAANG Interview Prep",
  "system-design": "System Design",
  career: "Career Advice",
  guides: "Guides & Comparisons",
}

export const categoryColors: Record<BlogPostMeta["category"], string> = {
  dsa: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  faang: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "system-design": "bg-green-500/20 text-green-400 border-green-500/30",
  career: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  guides: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

