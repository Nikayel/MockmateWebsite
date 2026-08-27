import Link from "next/link"

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <svg
            className="text-primary h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <h1 className="text-foreground mb-2 text-6xl font-bold">404</h1>

        <h2 className="text-foreground mb-4 text-xl font-semibold">Page Not Found</h2>

        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap shadow-xs transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go Home
          </Link>

          <Link
            href="/interview"
            className="bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-xs transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Start Free
          </Link>
        </div>

        <div className="border-border mt-12 border-t pt-8">
          <p className="text-muted-foreground text-sm">Looking for something specific?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
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
