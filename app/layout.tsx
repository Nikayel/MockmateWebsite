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
  title: "MockMate - Practice Realistic Interviews in VS Code",
  description:
    "Transform your coding interview preparation with AI-powered realistic interviews directly in VS Code. Practice with an intelligent interviewer and coding partner.",
  generator: "v0.app",
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
