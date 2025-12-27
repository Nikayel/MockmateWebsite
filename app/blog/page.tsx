import { getAllBlogPosts, getFeaturedPosts } from "@/lib/mdx"
import { BlogPageClient } from "@/components/blog/BlogPageClient"

export default function BlogPage() {
  const allPosts = getAllBlogPosts()
  const featuredPosts = getFeaturedPosts()

  return <BlogPageClient allPosts={allPosts} featuredPosts={featuredPosts} />
}
