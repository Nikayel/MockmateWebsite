"use client"

import { useBlogTheme } from "@/components/blog/BlogThemeProvider"
import { BlogThemeToggle } from "@/components/blog/BlogThemeToggle"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MDXContent } from "@/components/blog/MDXContent"
import { Calendar, Clock, ArrowLeft, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import { categoryLabels, type BlogPost } from "@/lib/mdx"
import "@/app/blog/blog.css"

const categoryBadgeColors: Record<string, { light: string; dark: string }> = {
  dsa: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-900/40 text-blue-400" },
  faang: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-900/40 text-purple-400" },
  "system-design": { light: "bg-green-100 text-green-700", dark: "bg-green-900/40 text-green-400" },
  career: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-900/40 text-amber-400" },
  guides: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-900/40 text-cyan-400" },
}

export function BlogPostLayout({ post }: { post: BlogPost }) {
  const { resolvedTheme } = useBlogTheme()
  const isLight = resolvedTheme === "light"
  const badgeColor = categoryBadgeColors[post.category] || categoryBadgeColors.guides

  return (
    <div className="blog-container">
      <Header />

      <article className={`pt-24 pb-16 ${isLight ? "bg-white" : "bg-black"}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Navigation and Theme Toggle */}
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/blog"
                className={`inline-flex items-center gap-2 transition-colors ${
                  isLight ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-white"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
              <BlogThemeToggle />
            </div>

            {/* Category Badge */}
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 ${
                isLight ? badgeColor.light : badgeColor.dark
              }`}
            >
              {categoryLabels[post.category]}
            </span>

            {/* Title */}
            <h1
              className={`text-4xl md:text-5xl font-bold mb-6 leading-tight tracking-tight ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              {post.title}
            </h1>

            {/* Meta Info */}
            <div
              className={`flex flex-wrap items-center gap-4 text-sm mb-8 pb-8 border-b ${
                isLight ? "text-gray-500 border-gray-200" : "text-gray-400 border-gray-800"
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            </div>

            {/* Content */}
            <div className="blog-content">
              <MDXContent content={post.content} isLight={isLight} />
            </div>

            {/* Tags */}
            <div className={`mt-12 pt-8 border-t ${isLight ? "border-gray-200" : "border-gray-800"}`}>
              <h4 className={`text-sm mb-3 ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-3 py-1 rounded-full text-sm ${
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
        className={`py-20 border-t ${
          isLight
            ? "bg-gradient-to-b from-gray-50 to-white border-gray-200"
            : "bg-gradient-to-b from-gray-950 to-black border-gray-800"
        }`}
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className={`text-3xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Ready to Practice?
          </h2>
          <p className={`mb-8 max-w-md mx-auto ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Apply these concepts with AI-powered mock interviews.
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
