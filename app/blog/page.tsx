import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { getAllBlogPosts, getFeaturedPosts, categoryLabels, categoryColors, type BlogPostMeta } from "@/lib/mdx"
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"

function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="group bg-gray-900/50 border border-gray-800 hover:border-accent/50 transition-all duration-300 h-full rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={categoryColors[post.category]}>
            {categoryLabels[post.category]}
          </Badge>
          {post.featured && (
            <Badge className="bg-accent/20 text-accent border-accent/30">
              Featured
            </Badge>
          )}
        </div>

        <h2 className="text-xl font-bold text-white group-hover:text-accent transition-colors line-clamp-2 mb-3">
          {post.title}
        </h2>

        <p className="text-gray-400 text-sm line-clamp-3 mb-4">
          {post.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.readTime}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1 text-accent text-sm font-medium group-hover:gap-2 transition-all">
          Read Article
          <ArrowRight className="w-4 h-4" />
        </div>
      </article>
    </Link>
  )
}

export default function BlogPage() {
  const allPosts = getAllBlogPosts()
  const featuredPosts = getFeaturedPosts()

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-accent/20 text-accent border-accent/30 mb-6">
              <BookOpen className="w-4 h-4 mr-2 inline" />
              CodeSparring Blog
            </Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Master Coding Interviews
              <span className="block text-accent">With Expert Guides</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Deep dives into DSA patterns, interview strategies, and the science of effective practice.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold text-white mb-8">
              Featured Articles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-12 bg-background border-t border-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-heading font-bold text-white mb-8">
            All Articles
          </h2>
          {allPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">
              No articles yet. Check back soon!
            </p>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Ready to Practice What You've Learned?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Apply these patterns with our AI mock interviews.
          </p>
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-semibold rounded-full hover:bg-accent/90 transition-colors"
          >
            Start Free Practice
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
