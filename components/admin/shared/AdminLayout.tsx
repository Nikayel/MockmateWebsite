"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { ReactNode } from "react"

interface AdminLayoutProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  children: ReactNode
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  refreshing?: boolean
  actions?: ReactNode
  headerActions?: ReactNode
}

export function AdminLayout({
  title,
  description,
  icon: Icon,
  children,
  loading = false,
  error = null,
  onRefresh,
  refreshing = false,
  actions,
  headerActions,
}: AdminLayoutProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-[#c4703f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400 text-center max-w-md">{error}</p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-2">
            {Icon && <Icon className="h-8 w-8 text-[#c4703f]" />}
            {title}
          </h1>
          {description && <p className="text-gray-400 mt-1">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {headerActions}

          {actions}

          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>
    </div>
  )
}

interface AdminSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function AdminSection({
  title,
  description,
  children,
  className = "",
}: AdminSectionProps) {
  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
          {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}