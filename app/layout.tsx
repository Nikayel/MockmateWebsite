import type React from "react"
import type { Metadata, Viewport } from "next"
import { Work_Sans, Open_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { AuthProvider } from "@/lib/auth-context"
import { RateLimitProvider } from "@/lib/contexts/rate-limit-context"
import { ErrorBoundaryProvider } from "@/components/providers/error-boundary-provider"
import { AnnouncementProvider } from "@/components/announcements"
import { CookieConsent } from "@/components/CookieConsent"
import { ConsentAnalytics } from "@/components/ConsentAnalytics"
import { PerformancePolyfill } from "@/components/performance-polyfill"
import { ReferralCapture } from "@/components/ReferralCapture"
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
  FounderPersonJsonLd,
} from "@/components/seo/JsonLd"
import "./globals.css"

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-work-sans",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
})

const siteConfig = {
  name: "CodeSparring",
  tagline: "Train the Skill Interviews Actually Test",
  description:
    "LeetCode tests problem-solving. Real interviews test performance under pressure. Practice with an AI interviewer that gives real feedback on how you communicate and think out loud—24/7, no scheduling.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://codesparring.dev",
  // OG images are now dynamically generated via app/opengraph-image.tsx
}

// Viewport configuration for mobile responsiveness
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
  ],
}

export const metadata: Metadata = {
  // Core metadata
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    // Primary keywords - differentiation focus
    "coding interview prep",
    "mock interview",
    "AI interviewer",
    "interview performance training",
    "LeetCode alternative",
    // Competitive positioning keywords
    "better than LeetCode",
    "LeetCode vs CodeSparring",
    "cheap mock interviews",
    "Interviewing.io alternative",
    "voice coding interview practice",
    // Long-tail keywords
    "tech interview preparation",
    "software engineering interview",
    "FAANG interview prep",
    "Google interview prep",
    "Amazon interview questions",
    "Meta coding interview",
    // Problem keywords
    "why I fail coding interviews",
    "LeetCode not enough",
    "interview anxiety practice",
    "practice thinking out loud coding",
    // Feature keywords
    "voice mock interview",
    "AI coding tutor",
    "spaced repetition coding",
    "interview practice app",
    "24/7 mock interviews",
    // Algorithm keywords
    "DSA practice",
    "algorithm practice",
    "data structures practice",
    "coding interview questions",
    // Related searches
    "how to pass coding interview",
    "coding interview tips",
    "technical interview practice",
    "software engineer interview questions",
  ],
  authors: [{ name: "Nikayel Ali Jamal" }],
  creator: siteConfig.name,
  publisher: siteConfig.name,

  // Favicon and icons - dynamically generated via app/icon.tsx and app/apple-icon.tsx
  // Keep SVG as fallback for browsers that support it
  icons: {
    icon: [{ url: "/icon-codesparring.svg", type: "image/svg+xml" }],
    shortcut: "/icon-codesparring.svg",
    apple: [{ url: "/icon-codesparring.svg", type: "image/svg+xml" }],
  },

  // Canonical URL
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },

  // Open Graph - for social sharing
  // Images are auto-generated via app/opengraph-image.tsx
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
  },

  // Twitter Card
  // Images are auto-generated via app/twitter-image.tsx
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    creator: "@codesparring",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Search Engine Verification
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* JSON-LD Structured Data for SEO */}
        <WebSiteJsonLd />
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
        <FounderPersonJsonLd />
        <style>{`
html {
  font-family: ${openSans.style.fontFamily};
}
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
                const originalMeasure = window.performance.measure.bind(window.performance);
                window.performance.measure = function(name, startMark, endMark) {
                  try {
                    return originalMeasure(name, startMark, endMark);
                  } catch (error) {
                    if (error instanceof TypeError && 
                        (error.message.includes('cannot have a negative time stamp') ||
                         error.message.includes('Slot.SlotClone'))) {
                      // Suppress harmless development error
                      return;
                    }
                    throw error;
                  }
                };
              }
            `,
          }}
        />
      </head>
      <body className={`${workSans.variable} ${openSans.variable} antialiased`}>
        {/* Skip link for keyboard accessibility - hidden until focused */}
        <a
          href="#main-content"
          className="focus:bg-accent focus:text-accent-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
        >
          Skip to main content
        </a>
        <PerformancePolyfill />
        <ReferralCapture />
        <ErrorBoundaryProvider>
          <AuthProvider>
            <RateLimitProvider>
              <AnnouncementProvider>
                <div id="main-content">{children}</div>
                <Toaster position="top-right" richColors />
                <CookieConsent />
                <ConsentAnalytics />
              </AnnouncementProvider>
            </RateLimitProvider>
          </AuthProvider>
        </ErrorBoundaryProvider>
      </body>
    </html>
  )
}
