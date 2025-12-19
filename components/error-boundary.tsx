"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { logger } from "@/lib/logger"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("ErrorBoundary caught an error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = "/"
                }}
                className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white"
              >
                Go Home
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

