"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp } from "lucide-react"

interface FunnelStage {
  name: string
  value: number
  color?: string
}

interface FunnelChartProps {
  title: string
  subtitle?: string
  stages: FunnelStage[]
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

export function FunnelChart({
  title,
  subtitle,
  stages,
  loading = false,
  icon: Icon,
}: FunnelChartProps) {
  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#00d9ff]" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-800 rounded" style={{ width: `${100 - i * 15}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stages || stages.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#00d9ff]" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...stages.map((s) => s.value))
  const defaultColors = [
    "#00d9ff", // cyan
    "#00ff88", // green
    "#FBBF24", // yellow
    "#F97316", // orange
    "#EF4444", // red
  ]

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#00d9ff]" />}
            {title}
          </CardTitle>
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
            const color = stage.color || defaultColors[index % defaultColors.length]
            const conversionRate = index > 0 && stages[index - 1].value > 0
              ? ((stage.value / stages[index - 1].value) * 100).toFixed(1)
              : null

            return (
              <div key={stage.name} className="relative">
                {/* Stage bar */}
                <div className="relative">
                  <div
                    className="h-14 rounded-lg flex items-center transition-all duration-300"
                    style={{
                      width: `${Math.max(width, 20)}%`,
                      backgroundColor: `${color}20`,
                      borderLeft: `4px solid ${color}`,
                    }}
                  >
                    <div className="flex items-center justify-between w-full px-4">
                      <span className="font-medium text-white">{stage.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-white">
                          {stage.value.toLocaleString()}
                        </span>
                        {conversionRate && (
                          <span className="text-sm text-gray-400">
                            ({conversionRate}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion arrow */}
                {index < stages.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <div className="text-gray-600">↓</div>
                    {stages[index + 1] && stages[index].value > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        {((stages[index + 1].value / stage.value) * 100).toFixed(1)}% convert
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Overall conversion */}
        {stages.length >= 2 && stages[0].value > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Overall Conversion</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-lg font-bold text-green-400">
                  {((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FunnelChart
