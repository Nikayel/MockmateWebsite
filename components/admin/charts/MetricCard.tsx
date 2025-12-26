"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"

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
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-[#00d9ff]",
  valueColor = "text-white",
  sparklineData,
  sparklineColor = "#00d9ff",
  loading = false,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-3 w-3 text-gray-500" />
    }
    return change > 0 ? (
      <TrendingUp className="h-3 w-3 text-green-400" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-400" />
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
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
            <div className="h-8 w-32 bg-gray-700 rounded mb-2" />
            <div className="h-3 w-20 bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
              <span className="text-sm font-medium text-gray-400">{title}</span>
            </div>

            <div className={cn("text-3xl font-bold mb-1", valueColor)}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>

            <div className="flex items-center gap-2">
              {change !== undefined && (
                <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
                  {getTrendIcon()}
                  <span>{Math.abs(change).toFixed(1)}%</span>
                  {changeLabel && (
                    <span className="text-gray-500">{changeLabel}</span>
                  )}
                </div>
              )}
              {subtitle && !change && (
                <span className="text-sm text-gray-500">{subtitle}</span>
              )}
            </div>
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="w-20 h-12">
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
