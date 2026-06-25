import type { MetadataRoute } from "next"
import { getAllBlogPosts } from "@/lib/mdx"
import { ALL_COMPANIES } from "@/lib/data/company-questions"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://codesparring.dev"

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString()

  // Core marketing pages - high priority
  const marketingPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/why-codesparring`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // SEO Landing Pages
    {
      url: `${BASE_URL}/ai-coding-interview-practice`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/system-design-interview-practice`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/bug-fix-interview-practice`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/software-engineer-interview-practice`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/new-grad-coding-interview-practice`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Comparison Pages
    {
      url: `${BASE_URL}/codesparring-vs-leetcode`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/codesparring-vs-hellointerview`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/codesparring-vs-interviewing-io`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/codesparring-vs-pramp`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/best-ai-coding-interview-tools`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Guides
    {
      url: `${BASE_URL}/guides/how-to-practice-bug-fix-interviews`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/guides/how-to-talk-through-coding-interviews`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/guides/what-is-a-real-world-coding-interview-round`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Free Public Practice
    {
      url: `${BASE_URL}/free-ai-coding-interview`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ]

  // Interview prep pages - high SEO value
  const interviewPrepPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/interview-prep`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Individual company prep pages
    ...ALL_COMPANIES.map((company) => ({
      url: `${BASE_URL}/interview-prep/${company.id}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ]

  // Roadmap preview page
  const roadmapPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/roadmap/preview`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]

  // Blog pages - high SEO value
  const blogListPage: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ]

  // Individual blog posts from MDX files
  const blogPostPages: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  // Sample feedback pages - showcase content
  const samplePages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/samples`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/samples/two-sum-excellent`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/samples/binary-tree-good`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/samples/dynamic-programming-needs-work`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ]

  // Secondary pages
  const secondaryPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/careers`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  return [
    ...marketingPages,
    ...interviewPrepPages,
    ...roadmapPages,
    ...blogListPage,
    ...blogPostPages,
    ...samplePages,
    ...secondaryPages,
  ]
}
