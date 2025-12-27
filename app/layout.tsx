import type React from "react"
import type { Metadata } from "next"
import { Work_Sans, Open_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { AuthProvider } from "@/lib/auth-context"
import { ErrorBoundaryProvider } from "@/components/providers/error-boundary-provider"
import { CookieConsent } from "@/components/CookieConsent"
import { ConsentAnalytics } from "@/components/ConsentAnalytics"
import { PerformancePolyfill } from "@/components/performance-polyfill"
import { OrganizationJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/JsonLd"
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
  name: "Skillon",
  tagline: "Ace Your Tech Interview with AI Mock Practice",
  description: "Practice coding interviews with an AI interviewer available 24/7. Talk through problems out loud, get instant feedback, and master DSA patterns. Better than grinding LeetCode alone.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://skillon.dev",
  ogImage: "/og-image.png",
}

export const metadata: Metadata = {
  // Core metadata
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "coding interview prep",
    "mock interview",
    "AI interviewer",
    "DSA practice",
    "LeetCode alternative",
    "tech interview preparation",
    "software engineering interview",
    "FAANG interview prep",
    "algorithm practice",
    "data structures practice",
    "coding interview questions",
    "behavioral interview prep",
    "system design interview",
    "voice mock interview",
    "AI coding tutor",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,

  // Favicon and icons
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },

  // Canonical URL
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },

  // Open Graph - for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - AI Mock Interview Platform`,
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@skillon_dev",
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

  // Verification (add your IDs when ready)
  // verification: {
  //   google: "your-google-verification-code",
  // },
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
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
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
        <PerformancePolyfill />
        <ErrorBoundaryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
            <CookieConsent />
            <ConsentAnalytics />
          </AuthProvider>
        </ErrorBoundaryProvider>
      </body>
    </html>
  )
}
