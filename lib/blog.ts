// Blog content management utilities

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  readTime: string
  category: "dsa" | "faang" | "system-design" | "career" | "guides"
  tags: string[]
  featured?: boolean
}

export interface BlogPostWithContent extends BlogPost {
  content: string
}

// Blog post metadata - add new posts here
export const blogPosts: BlogPost[] = [
  {
    slug: "two-sum-5-solutions",
    title: "Two Sum: 5 Solutions from Brute Force to Optimal",
    description: "Master the classic Two Sum problem with 5 different approaches. Learn when to use each solution and ace your coding interview.",
    date: "2024-12-27",
    author: "CodeSparring Team",
    readTime: "8 min read",
    category: "dsa",
    tags: ["arrays", "hash-map", "two-pointers", "leetcode", "interview-prep"],
    featured: true,
  },
  {
    slug: "leetcode-vs-codesparring",
    title: "LeetCode vs CodeSparring: Which is Better for Interview Prep?",
    description: "An honest comparison of LeetCode and CodeSparring. Discover which platform fits your learning style and interview goals.",
    date: "2024-12-27",
    author: "CodeSparring Team",
    readTime: "6 min read",
    category: "guides",
    tags: ["leetcode", "comparison", "interview-prep", "study-tools"],
    featured: true,
  },
  {
    slug: "15-dsa-patterns",
    title: "15 DSA Patterns Every Developer Should Master",
    description: "The essential algorithm patterns that appear in 90% of coding interviews. Master these and you'll handle any problem thrown at you.",
    date: "2024-12-27",
    author: "CodeSparring Team",
    readTime: "12 min read",
    category: "dsa",
    tags: ["patterns", "algorithms", "data-structures", "interview-prep"],
    featured: true,
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getBlogPostsByCategory(category: BlogPost["category"]): BlogPost[] {
  return blogPosts.filter((post) => post.category === category)
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((post) => post.featured)
}

export function getAllTags(): string[] {
  const tags = new Set<string>()
  blogPosts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)))
  return Array.from(tags).sort()
}

export const categoryLabels: Record<BlogPost["category"], string> = {
  dsa: "Data Structures & Algorithms",
  faang: "FAANG Interview Prep",
  "system-design": "System Design",
  career: "Career Advice",
  guides: "Guides & Comparisons",
}

export const categoryColors: Record<BlogPost["category"], string> = {
  dsa: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  faang: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "system-design": "bg-green-500/20 text-green-400 border-green-500/30",
  career: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  guides: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}
