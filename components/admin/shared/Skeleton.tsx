"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Base skeleton component
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-800", className)}
      {...props}
    />
  )
}

// Skeleton for MetricCard
function MetricCardSkeleton() {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-9 w-28 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-12 w-20 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton for a full metrics grid (4 cards)
export function MetricsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Skeleton for a chart card
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-3 w-24 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full rounded-lg`} style={{ height }} />
      </CardContent>
    </Card>
  )
}

// Skeleton for settings/config cards
export function SettingsCardSkeleton() {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Dashboard-specific skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Key metrics */}
      <MetricsGridSkeleton count={4} />

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={280} />
        <ChartSkeleton height={280} />
      </div>

      {/* Three column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartSkeleton height={280} />
        </div>
        <ChartSkeleton height={280} />
      </div>
    </div>
  )
}

// User list skeleton
export function UserListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-64 rounded" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-3 px-4 text-left"><Skeleton className="h-3 w-12" /></th>
                <th className="py-3 px-4 text-left"><Skeleton className="h-3 w-10" /></th>
                <th className="py-3 px-4 text-left"><Skeleton className="h-3 w-8" /></th>
                <th className="py-3 px-4 text-left"><Skeleton className="h-3 w-16" /></th>
                <th className="py-3 px-4 text-left"><Skeleton className="h-3 w-14" /></th>
                <th className="py-3 px-4 text-right"><Skeleton className="h-3 w-16" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-3 px-4">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-5 w-12 rounded-full" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default Skeleton
