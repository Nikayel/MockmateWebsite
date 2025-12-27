import fs from "fs"
import path from "path"
import matter from "gray-matter"
import readingTime from "reading-time"
import type { BlogPostMeta, BlogPost } from "./blog-types"

const BLOG_DIR = path.join(process.cwd(), "content/blog")

// Re-export types for convenience
export type { BlogPostMeta, BlogPost }

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

// Re-export constants for convenience
export { categoryLabels, categoryColors } from "./blog-types"
