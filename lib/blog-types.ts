export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  author: string
  readTime: string
  category: "dsa" | "faang" | "system-design" | "career" | "guides"
  tags: string[]
  featured?: boolean
  image?: string
}

export interface BlogPost extends BlogPostMeta {
  content: string
}

// Category metadata
export const categoryLabels: Record<BlogPostMeta["category"], string> = {
  dsa: "Data Structures & Algorithms",
  faang: "FAANG Interview Prep",
  "system-design": "System Design",
  career: "Career Advice",
  guides: "Guides & Comparisons",
}

export const categoryColors: Record<BlogPostMeta["category"], string> = {
  dsa: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  faang: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "system-design": "bg-green-500/20 text-green-400 border-green-500/30",
  career: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  guides: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

/** The two class strings a category badge needs, one per blog theme. */
export interface BlogCategoryBadgeColor {
  light: string
  dark: string
}

/**
 * Category -> badge classes for the theme-aware blog surfaces.
 *
 * Distinct from `categoryColors` above, which is the older dark-only treatment.
 * This one is what /blog and /blog/[slug] actually render, and it lived as a
 * byte-identical local literal in both of those components until a category
 * added to one of them would have rendered as the `guides` fallback in the
 * other. Keyed on the category union so a sixth category fails to compile here
 * instead of silently falling back at two call sites.
 *
 * Tailwind's JIT only sees literal class names, so these stay spelled out.
 */
export const categoryBadgeColors: Record<BlogPostMeta["category"], BlogCategoryBadgeColor> = {
  dsa: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-900/40 text-blue-400" },
  faang: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-900/40 text-purple-400" },
  "system-design": { light: "bg-green-100 text-green-700", dark: "bg-green-900/40 text-green-400" },
  career: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-900/40 text-amber-400" },
  guides: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-900/40 text-cyan-400" },
}

/**
 * Badge classes for a post's category.
 *
 * Takes a plain `string` because a category reaches here from MDX frontmatter,
 * which the type system never checked; an unrecognised one falls back to
 * `guides` exactly as the call sites did inline.
 */
export function blogCategoryBadgeColor(category: string): BlogCategoryBadgeColor {
  return categoryBadgeColors[category as BlogPostMeta["category"]] ?? categoryBadgeColors.guides
}
