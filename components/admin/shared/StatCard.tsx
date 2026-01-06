"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: string
  badge?: string
  badgeColor?: string
  trend?: {
    value: number
    label?: string
  }
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-white",
  badge,
  badgeColor = "bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30",
}: StatCardProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg">
      <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <div className="flex items-center gap-2">
          <p className={cn("text-base font-medium", color)}>{value}</p>
          {badge && (
            <Badge className={cn("text-xs", badgeColor)}>{badge}</Badge>
          )}
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  description?: string
  icon: LucideIcon
  iconColor?: string
  valueColor?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  iconColor = "text-[#00d9ff]",
  valueColor = "text-white",
  className = "",
}: MetricCardProps) {
  return (
    <Card className={cn("bg-gray-900/50 border-gray-800", className)}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-gray-400 mb-3">
          <Icon className={cn("h-5 w-5", iconColor)} />
          <span className="text-sm font-medium">{title}</span>
        </div>

        <div className="mb-1">
          <div className={cn("text-3xl font-bold", valueColor)}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>

        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface ComparisonCardProps {
  title: string
  primaryValue: number
  secondaryValue: number
  primaryLabel: string
  secondaryLabel: string
  primaryColor?: string
  secondaryColor?: string
  format?: (value: number) => string
  icon: LucideIcon
  description?: string
}

export function ComparisonCard({
  title,
  primaryValue,
  secondaryValue,
  primaryLabel,
  secondaryLabel,
  primaryColor = "bg-blue-500/10 border-blue-500/20",
  secondaryColor = "bg-purple-500/10 border-purple-500/20",
  format = (v) => v.toString(),
  icon: Icon,
  description,
}: ComparisonCardProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-gray-400 mb-3">
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{title}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className={cn("text-center p-3 rounded border", primaryColor)}>
            <p className="text-xs text-gray-400 mb-1">{primaryLabel}</p>
            <p className="text-lg font-bold text-white">{format(primaryValue)}</p>
          </div>
          <div className={cn("text-center p-3 rounded border", secondaryColor)}>
            <p className="text-xs text-gray-400 mb-1">{secondaryLabel}</p>
            <p className="text-lg font-bold text-white">{format(secondaryValue)}</p>
          </div>
        </div>

        {description && (
          <p className="text-xs text-gray-500 text-center mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
