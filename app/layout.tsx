import type React from "react"
import type { Metadata } from "next"
import { Work_Sans, Open_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { AuthProvider } from "@/lib/auth-context"
import { CookieConsent } from "@/components/CookieConsent"
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

export const metadata: Metadata = {
  title: "Skillon - AI-Powered Technical Interview Practice",
  description:
    "Master coding interviews with AI-powered realistic practice sessions. Get real-time feedback from an intelligent interviewer and land your dream tech job.",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
        <style>{`
html {
  font-family: ${openSans.style.fontFamily};
}
        `}</style>
      </head>
      <body className={`${workSans.variable} ${openSans.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  )
}
