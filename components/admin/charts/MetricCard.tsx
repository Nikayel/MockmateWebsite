"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"
import {
  typography,
  spacing,
  cardStyles,
  iconSizes,
} from "@/lib/admin/design-system"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number // Percentage change
  changeLabel?: string
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  valueColor?: string
  sparklineData?: number[]
  sparklineColor?: string
  loading?: boolean
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-[#c4703f]",
  valueColor = "text-white",
  sparklineData,
  sparklineColor = "#c4703f",
  loading = false,
  className,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className={`${iconSizes.xs} text-gray-500`} />
    }
    return change > 0 ? (
      <TrendingUp className={`${iconSizes.xs} text-green-400`} />
    ) : (
      <TrendingDown className={`${iconSizes.xs} text-red-400`} />
    )
  }

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-gray-500"
    return change > 0 ? "text-green-400" : "text-red-400"
  }

  // Convert sparkline data to recharts format
  const chartData = sparklineData?.map((value, index) => ({ value, index })) || []

  if (loading) {
    return (
      <Card className={cn(cardStyles.default, className)}>
        <CardContent className={spacing.cardPadding}>
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
            <div className="h-9 w-32 bg-gray-700 rounded mb-2" />
            <div className="h-3 w-20 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(cardStyles.interactive, className)}>
      <CardContent className={spacing.cardPadding}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header with icon and title */}
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className={cn(iconSizes.sm, iconColor)} />}
              <span className={typography.metricLabel}>{title}</span>
            </div>

            {/* Value */}
            <div className={cn(typography.metricValue, valueColor, "mb-1")}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>

            {/* Subtitle or Change indicator */}
            <div className="flex items-center gap-2 min-h-[1.25rem]">
              {change !== undefined ? (
                <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
                  {getTrendIcon()}
                  <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
                  {changeLabel && (
                    <span className={typography.metricSubtext}>{changeLabel}</span>
                  )}
                </div>
              ) : subtitle ? (
                <span className={typography.metricSubtext}>{subtitle}</span>
              ) : null}
            </div>
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="w-20 h-12 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricCard
