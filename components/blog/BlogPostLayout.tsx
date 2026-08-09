"use client"

import { useBlogTheme } from "@/components/blog/BlogThemeProvider"
import { BlogThemeToggle } from "@/components/blog/BlogThemeToggle"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MDXContent } from "@/components/blog/MDXContent"
import { Calendar, Clock, ArrowLeft, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import { blogCategoryBadgeColor, categoryLabels, type BlogPost } from "@/lib/blog-types"
import "@/app/blog/blog.css"

export function BlogPostLayout({ post }: { post: BlogPost }) {
  const { resolvedTheme } = useBlogTheme()
  const isLight = resolvedTheme === "light"
  const badgeColor = blogCategoryBadgeColor(post.category)

  return (
    <div className="blog-container">
      <Header />

      <article className={`pt-24 pb-16 ${isLight ? "bg-white" : "bg-black"}`}>
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            {/* Navigation and Theme Toggle */}
            <div className="mb-8 flex items-center justify-between">
              <Link
                href="/blog"
                className={`inline-flex items-center gap-2 transition-colors ${
                  isLight ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-white"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Link>
              <BlogThemeToggle />
            </div>

            {/* Category Badge */}
            <span
              className={`mb-6 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                isLight ? badgeColor.light : badgeColor.dark
              }`}
            >
              {categoryLabels[post.category]}
            </span>

            {/* Title */}
            <h1
              className={`mb-6 text-4xl leading-tight font-bold tracking-tight md:text-5xl ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              {post.title}
            </h1>

            {/* Meta Info */}
            <div
              className={`mb-8 flex flex-wrap items-center gap-4 border-b pb-8 text-sm ${
                isLight ? "border-gray-200 text-gray-500" : "border-gray-800 text-gray-400"
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </span>
            </div>

            {/* Content */}
            <div className="blog-content">
              <MDXContent content={post.content} isLight={isLight} />
            </div>

            {/* Tags */}
            <div
              className={`mt-12 border-t pt-8 ${isLight ? "border-gray-200" : "border-gray-800"}`}
            >
              <h4 className={`mb-3 text-sm ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-3 py-1 text-sm ${
                      isLight ? "bg-gray-100 text-gray-600" : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* CTA Section */}
      <section
        className={`border-t py-20 ${
          isLight
            ? "border-gray-200 bg-gradient-to-b from-gray-50 to-white"
            : "border-gray-800 bg-gradient-to-b from-gray-950 to-black"
        }`}
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className={`mb-4 text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Ready to Practice?
          </h2>
          <p className={`mx-auto mb-8 max-w-md ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Apply these concepts with AI-powered mock interviews.
          </p>
          <Link
            href="/interview"
            className={`inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold transition-all ${
              isLight
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Start Free Practice
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
