import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBlogPostBySlug, getBlogSlugs, categoryLabels, categoryColors } from "@/lib/mdx"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ArrowLeft, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import { MDXContent } from "@/components/blog/MDXContent"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return { title: "Post Not Found" }
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | CodeSparring`,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
  }
}

export async function generateStaticParams() {
  const slugs = getBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

function ArticleJsonLd({ post }: { post: { title: string; description: string; date: string; author: string; slug: string } }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: { "@type": "Person", name: post.author },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "CodeSparring",
      logo: { "@type": "ImageObject", url: "https://codesparring.com/icon-codesparring.svg" },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <ArticleJsonLd post={post} />
      <Header />

      <article className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            <Badge className={`${categoryColors[post.category]} mb-4`}>
              {categoryLabels[post.category]}
            </Badge>

            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-800">
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

            <div className="prose prose-invert prose-lg max-w-none
              prose-headings:font-heading prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-code:text-accent prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800
              prose-strong:text-white
              prose-ul:text-gray-300 prose-ol:text-gray-300
            ">
              <MDXContent content={post.content} />
            </div>

            <div className="mt-12 pt-8 border-t border-gray-800">
              <h4 className="text-sm text-gray-500 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>

      <section className="py-16 bg-gradient-to-b from-background to-black border-t border-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Ready to Practice?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Practice these concepts with AI-powered mock interviews.
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
