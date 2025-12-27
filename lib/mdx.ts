import fs from "fs"
import path from "path"
import matter from "gray-matter"
import readingTime from "reading-time"

const BLOG_DIR = path.join(process.cwd(), "content/blog")

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

// Get all blog post slugs
export function getBlogSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return []
  }
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(".mdx", ""))
}

// Get a single blog post by slug
export function getBlogPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, "utf8")
  const { data, content } = matter(fileContents)
  const stats = readingTime(content)

  return {
    slug,
    title: data.title || "",
    description: data.description || "",
    date: data.date || new Date().toISOString(),
    author: data.author || "CodeSparring Team",
    readTime: stats.text,
    category: data.category || "guides",
    tags: data.tags || [],
    featured: data.featured || false,
    image: data.image,
    content,
  }
}

// Get all blog posts (metadata only for listing)
export function getAllBlogPosts(): BlogPostMeta[] {
  const slugs = getBlogSlugs()

  const posts = slugs
    .map((slug) => {
      const post = getBlogPostBySlug(slug)
      if (!post) return null

      // Return metadata only (no content)
      const { content, ...meta } = post
      return meta
    })
    .filter((post): post is BlogPostMeta => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return posts
}

// Get featured posts
export function getFeaturedPosts(): BlogPostMeta[] {
  return getAllBlogPosts().filter((post) => post.featured)
}

// Get posts by category
export function getPostsByCategory(category: BlogPostMeta["category"]): BlogPostMeta[] {
  return getAllBlogPosts().filter((post) => post.category === category)
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
