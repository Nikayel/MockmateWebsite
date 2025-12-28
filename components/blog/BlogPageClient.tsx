"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"
import { useBlogTheme } from "@/components/blog/BlogThemeProvider"
import { BlogThemeToggle } from "@/components/blog/BlogThemeToggle"
import { categoryLabels, type BlogPostMeta } from "@/lib/blog-types"
import "@/app/blog/blog.css"

const categoryBadgeColors: Record<string, { light: string; dark: string }> = {
  dsa: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-900/40 text-blue-400" },
  faang: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-900/40 text-purple-400" },
  "system-design": { light: "bg-green-100 text-green-700", dark: "bg-green-900/40 text-green-400" },
  career: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-900/40 text-amber-400" },
  guides: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-900/40 text-cyan-400" },
}

function BlogCard({ post, isLight }: { post: BlogPostMeta; isLight: boolean }) {
  const badgeColor = categoryBadgeColors[post.category] || categoryBadgeColors.guides

  return (
    <Link href={`/blog/${post.slug}`}>
      <article className={`group blog-card h-full ${isLight ? "hover:shadow-lg" : ""}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isLight ? badgeColor.light : badgeColor.dark}`}>
            {categoryLabels[post.category]}
          </span>
          {post.featured && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${isLight ? "bg-orange-100 text-orange-700" : "bg-orange-900/40 text-orange-400"}`}>
              Featured
            </span>
          )}
        </div>

        <h2 className={`text-xl font-semibold mb-3 line-clamp-2 transition-colors ${isLight ? "text-gray-900 group-hover:text-blue-600" : "text-white group-hover:text-blue-400"}`}>
          {post.title}
        </h2>

        <p className={`text-sm line-clamp-3 mb-4 leading-relaxed ${isLight ? "text-gray-600" : "text-gray-400"}`}>
          {post.description}
        </p>

        <div className={`flex items-center gap-4 text-xs mb-4 ${isLight ? "text-gray-500" : "text-gray-500"}`}>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {post.readTime}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`blog-tag text-xs ${isLight ? "bg-gray-100 text-gray-600" : "bg-gray-800 text-gray-400"}`}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className={`flex items-center gap-1.5 text-sm font-medium group-hover:gap-2.5 transition-all ${isLight ? "text-blue-600" : "text-blue-400"}`}>
          Read article
          <ArrowRight className="w-4 h-4" />
        </div>
      </article>
    </Link>
  )
}

export function BlogPageClient({
  allPosts,
  featuredPosts
}: {
  allPosts: BlogPostMeta[]
  featuredPosts: BlogPostMeta[]
}) {
  const { resolvedTheme } = useBlogTheme()
  const isLight = resolvedTheme === "light"

  // Limit featured to 3 and exclude them from "All Articles" to avoid duplication
  const displayedFeatured = featuredPosts.slice(0, 3)
  const featuredSlugs = new Set(displayedFeatured.map(p => p.slug))
  const regularPosts = allPosts.filter(post => !featuredSlugs.has(post.slug))

  return (
    <div className="blog-container">
      <Header />

      {/* Hero Section */}
      <section className={`pt-28 pb-16 ${isLight ? "bg-gradient-to-b from-gray-50 to-white" : "bg-gradient-to-b from-gray-900 to-black"}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            {/* Theme Toggle */}
            <div className="flex justify-center mb-8">
              <BlogThemeToggle />
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${isLight ? "bg-blue-100 text-blue-700" : "bg-blue-900/40 text-blue-400"}`}>
              <BookOpen className="w-4 h-4" />
              CodeSparring Blog
            </div>

            <h1 className={`text-4xl md:text-6xl font-bold mb-6 tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
              Master Coding Interviews
            </h1>
            <p className={`text-xl max-w-2xl mx-auto leading-relaxed ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Deep dives into DSA patterns, interview strategies, and the science of effective practice.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts - Limited to 3 */}
      {displayedFeatured.length > 0 && (
        <section className={`py-16 ${isLight ? "bg-white" : "bg-black"}`}>
          <div className="container mx-auto px-4">
            <h2 className={`text-2xl font-semibold mb-8 ${isLight ? "text-gray-900" : "text-white"}`}>
              Featured Articles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedFeatured.map((post) => (
                <BlogCard key={post.slug} post={post} isLight={isLight} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts - Excludes featured posts */}
      <section className={`py-16 border-t ${isLight ? "bg-gray-50 border-gray-200" : "bg-gray-950 border-gray-800"}`}>
        <div className="container mx-auto px-4">
          <h2 className={`text-2xl font-semibold mb-8 ${isLight ? "text-gray-900" : "text-white"}`}>
            More Articles
          </h2>
          {regularPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <BlogCard key={post.slug} post={post} isLight={isLight} />
              ))}
            </div>
          ) : (
            <p className={`text-center py-12 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              More articles coming soon!
            </p>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${isLight ? "bg-white border-t border-gray-200" : "bg-black border-t border-gray-800"}`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className={`text-3xl font-semibold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Ready to Practice?
          </h2>
          <p className={`mb-8 max-w-md mx-auto ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Apply these patterns with AI-powered mock interviews.
          </p>
          <Link
            href="/interview"
            className={`inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-full transition-all ${
              isLight
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Start Free Practice
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

