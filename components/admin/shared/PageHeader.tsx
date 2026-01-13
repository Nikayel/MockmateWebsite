"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { typography, timeRangeStyles, iconSizes } from "@/lib/admin/design-system"

interface TimeRangeOption {
  value: string
  label: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  // Time range selector
  timeRange?: string
  onTimeRangeChange?: (range: string) => void
  timeRangeOptions?: TimeRangeOption[]
  // Refresh button
  onRefresh?: () => void
  refreshing?: boolean
  refreshLabel?: string
  // Additional actions
  actions?: React.ReactNode
}

const defaultTimeRanges: TimeRangeOption[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
]

export function PageHeader({
  title,
  subtitle,
  timeRange,
  onTimeRangeChange,
  timeRangeOptions = defaultTimeRanges,
  onRefresh,
  refreshing = false,
  refreshLabel = "Refresh",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Title Section */}
      <div>
        <h1 className={typography.pageTitle}>{title}</h1>
        {subtitle && <p className={typography.pageSubtitle}>{subtitle}</p>}
      </div>

      {/* Actions Section */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Time Range Selector */}
        {timeRange && onTimeRangeChange && (
          <div className={timeRangeStyles.container}>
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={timeRange === option.value ? "default" : "ghost"}
                onClick={() => onTimeRangeChange(option.value)}
                className={
                  timeRange === option.value
                    ? timeRangeStyles.button.active
                    : timeRangeStyles.button.inactive
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            {refreshing ? (
              <Loader2 className={`${iconSizes.sm} mr-2 animate-spin`} />
            ) : (
              <RefreshCw className={`${iconSizes.sm} mr-2`} />
            )}
            {refreshLabel}
          </Button>
        )}

        {/* Custom Actions */}
        {actions}
      </div>
    </div>
  )
}
