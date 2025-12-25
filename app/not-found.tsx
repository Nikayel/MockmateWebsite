"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion, Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>

        <h2 className="text-xl font-semibold text-foreground mb-4">
          Page Not Found
        </h2>

        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex gap-3 justify-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/interview">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start Interview
            </Link>
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
            <Link href="/pricing" className="text-primary hover:underline">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-primary hover:underline">
              Dashboard
            </Link>
            <Link href="/roadmap" className="text-primary hover:underline">
              Roadmap
            </Link>
            <Link href="/docs" className="text-primary hover:underline">
              Documentation
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
