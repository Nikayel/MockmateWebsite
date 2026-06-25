import { getAllBlogPosts, getFeaturedPosts } from "@/lib/mdx"
import { BlogPageClient } from "@/components/blog/BlogPageClient"
import { BlogCollectionJsonLd } from "@/components/seo/JsonLd"

export default function BlogPage() {
  const allPosts = getAllBlogPosts()
  const featuredPosts = getFeaturedPosts()

  return (
    <>
      <BlogCollectionJsonLd posts={allPosts} />
      <BlogPageClient allPosts={allPosts} featuredPosts={featuredPosts} />
    </>
  )
}
