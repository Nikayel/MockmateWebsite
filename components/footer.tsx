import { Mail } from "lucide-react"
import Link from "next/link"
import { APP_CONFIG } from "@/lib/config"
import { Logo } from "@/components/Logo"
import { LEARN_COURSE_LABEL, LEARN_HUB_PATH, trackPath } from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * The complete lesson index. Hardcoded as a literal here rather than imported from
 * `app/learn/all/page.tsx`, because that page imports the curriculum registries and this footer is
 * rendered inside several `"use client"` trees. Pulling a server-only module in through a shared
 * constant would ship megabytes of authored lessons to the browser.
 */
const LEARN_ALL_LESSONS_PATH = "/learn/all"

type FooterTrackLink = { label: string; href: string }

/**
 * The Learn tracks, one footer link each.
 *
 * Before this column existed the marketing surface had no crawlable link into `/learn` at all, so
 * every lesson page launched as an orphan. Site-wide footer links are what put each track one hop
 * from the homepage and every lesson three.
 *
 * Written as a `Record<CourseId, …>` so the day a fourth course lands this fails to compile instead
 * of quietly dropping a track. `trackPath` is the URL authority; the paths are never spelled out
 * here. `lesson-routes` is pure string building, which is what makes it safe to import from a
 * component that ends up in client bundles.
 */
const FOOTER_TRACK_LINKS: Record<CourseId, FooterTrackLink> = {
  python: { label: LEARN_COURSE_LABEL.python, href: trackPath("python") },
  "data-engineering": {
    label: LEARN_COURSE_LABEL["data-engineering"],
    href: trackPath("data-engineering"),
  },
  "system-design": {
    label: LEARN_COURSE_LABEL["system-design"],
    href: trackPath("system-design"),
  },
}

/**
 * The standalone SEO landing pages and long-form guides.
 *
 * Every path below was submitted in `app/sitemap.ts` and linked from nowhere on the site. A URL a
 * crawler can only reach through the sitemap is the textbook shape of "Discovered, currently not
 * indexed": Google learns the URL exists, finds no internal link telling it the page matters, and
 * declines to spend crawl budget on it. Eight pages sat in that state.
 *
 * A site-wide footer column is the cheapest fix available, because it puts every one of them
 * exactly one hop from every page on the site rather than zero hops from anywhere.
 *
 * Exported so `components/__tests__/footer-links.test.tsx` can assert the column still covers the
 * pages it was created for. Adding a landing page means adding it here as well as to the sitemap.
 */
export const FOOTER_GUIDE_LINKS: readonly FooterTrackLink[] = [
  { label: "AI coding interview practice", href: "/ai-coding-interview-practice" },
  { label: "System design interviews", href: "/system-design-interview-practice" },
  { label: "Software engineer interviews", href: "/software-engineer-interview-practice" },
  { label: "New grad interviews", href: "/new-grad-coding-interview-practice" },
  { label: "Free AI mock interview", href: "/free-ai-coding-interview" },
  { label: "Best AI interview tools", href: "/best-ai-coding-interview-tools" },
  { label: "Talking through a problem", href: "/guides/how-to-talk-through-coding-interviews" },
  {
    label: "Real-world interview rounds",
    href: "/guides/what-is-a-real-world-coding-interview-round",
  },
]

export function Footer() {
  return (
    <footer className="bg-background border-border border-t">
      <div className="container mx-auto px-4 py-12">
        {/* The brand block sits on its own row rather than inside the link grid. With six link
            columns a sixth-width brand paragraph wraps to a dozen lines; pulling it out keeps both
            halves readable at every breakpoint. */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          {/* Brand */}
          <div className="space-y-4 lg:w-64 lg:shrink-0">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-ui text-foreground text-xl font-semibold tracking-tight">
                CodeSparring
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              CodeSparring.dev is the premier AI technical interview practice platform. Master your
              next software engineering interview with realistic coding, system design, and bug-fix
              simulations.
            </p>
            {/* These were three bare <svg>s carrying cursor-pointer and a hover
                colour change: they looked and felt clickable, had no link, no
                handler, and no accessible name, so nothing happened when you
                clicked and a screen reader never saw them at all.

                Only one of the three had a real destination. APP_CONFIG.githubUrl
                (github.com/nikayel/codesparring) returns 404 and there is no
                CodeSparring Twitter account, so linking those would just be a
                working link to nothing. They are removed rather than faked; add
                them back here when the accounts exist. */}
            <div className="flex space-x-4">
              <a
                href={`mailto:${APP_CONFIG.supportEmail}`}
                aria-label={`Email support at ${APP_CONFIG.supportEmail}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail aria-hidden className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
            {/* Product Links */}
            <div>
              <h3 className="text-foreground mb-4 font-semibold">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/pricing"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="/interview"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Try It Free
                  </a>
                </li>
                <li>
                  <a
                    href="/samples"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sample Reports
                  </a>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <a
                    href="/docs"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            {/* Learn — the free curriculum. Every entry is a plain anchor so it is crawlable. */}
            <div>
              <h3 className="text-foreground mb-4 font-semibold">Learn</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={LEARN_HUB_PATH}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    All courses
                  </Link>
                </li>
                {Object.values(FOOTER_TRACK_LINKS).map((track) => (
                  <li key={track.href}>
                    <Link
                      href={track.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {track.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={LEARN_ALL_LESSONS_PATH}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Lesson index
                  </Link>
                </li>
              </ul>
            </div>

            {/* Guides & comparisons — the SEO landing pages, previously reachable only via the
              sitemap. Plain crawlable links, no JS gate, on every page of the site. */}
            <div>
              <h3 className="text-foreground mb-4 font-semibold">Guides &amp; comparisons</h3>
              <ul className="space-y-2 text-sm">
                {FOOTER_GUIDE_LINKS.map((guide) => (
                  <li key={guide.href}>
                    <Link
                      href={guide.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {guide.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-foreground mb-4 font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/legal#privacy-policy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/legal#terms-of-service"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="/legal#cookie-policy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cookie Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/legal#data-processing"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Your Data Rights
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:security@codesparring.dev"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Security
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-foreground mb-4 font-semibold">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/docs"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@codesparring.dev"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact Support
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/nikayel/codesparring/issues"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Report Issues
                  </a>
                </li>
                <li>
                  <a
                    href="/careers"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Careers
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-border mt-8 border-t pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 CodeSparring. Built with care by{" "}
            <a
              href="https://linkedin.com/in/nikayel-ali"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              title="Nikayel Ali - Founder of CodeSparring"
            >
              Nikayel Ali
            </a>{" "}
            in Sacramento, CA
          </p>
        </div>
      </div>
    </footer>
  )
}
