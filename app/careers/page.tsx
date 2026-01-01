import { CareersPageClient } from "@/components/careers/CareersPageClient"

/**
 * Careers Page - Server Component
 *
 * Static job listings are defined server-side for SEO benefits.
 * Animations are handled by the client component.
 */

// Role data - defined server-side for SEO
const roles = [
  {
    title: "Growth",
    type: "Marketing",
    description: "Help us reach more developers. Run experiments, find what works, grow the community.",
    tags: ["Content", "Community", "Analytics"],
  },
  {
    title: "Fullstack Developer",
    type: "Engineering",
    description: "Build features across the stack. Bonus if you've worked with RAG or AI systems.",
    tags: ["React", "Node", "AI/ML"],
  },
]

export default function CareersPage() {
  return <CareersPageClient roles={roles} />
}
