import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBlogPostBySlug, getBlogSlugs } from "@/lib/mdx"
import { BlogPostLayout } from "@/components/blog/BlogPostLayout"
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd"

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
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  }
}

export async function generateStaticParams() {
  const slugs = getBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <main>
      {/* Structured data for better SERP appearance */}
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={`/blog/${post.slug}`}
        datePublished={post.date}
        author={post.author}
        image={post.image}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` },
        ]}
      />
      <BlogPostLayout post={post} />
    </main>
  )
}
