"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CohortData {
  cohort: string // e.g., "Jan 2025"
  size: number // Number of users in cohort
  retention: number[] // Retention percentages for each period (week/month)
}

interface CohortHeatmapProps {
  title: string
  subtitle?: string
  data: CohortData[]
  periodLabels?: string[] // e.g., ["Week 1", "Week 2", ...]
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

export function CohortHeatmap({
  title,
  subtitle,
  data,
  periodLabels = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  loading = false,
  icon: Icon,
}: CohortHeatmapProps) {
  const getRetentionColor = (value: number): string => {
    // Color gradient from red (0%) to green (100%)
    if (value >= 80) return "bg-green-500"
    if (value >= 60) return "bg-green-600/80"
    if (value >= 40) return "bg-yellow-500/80"
    if (value >= 20) return "bg-orange-500/80"
    if (value > 0) return "bg-red-500/80"
    return "bg-gray-800"
  }

  const getTextColor = (value: number): string => {
    if (value >= 40) return "text-black"
    return "text-white"
  }

  if (loading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#c4703f]" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#c4703f]" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No cohort data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine the max number of periods
  const maxPeriods = Math.max(...data.map((d) => d.retention.length))
  const displayPeriods = periodLabels.slice(0, maxPeriods)

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[#c4703f]" />}
            {title}
          </CardTitle>
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-gray-400 pb-3 pr-4">
                  Cohort
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3 px-2">
                  Users
                </th>
                {displayPeriods.map((label, i) => (
                  <th
                    key={i}
                    className="text-center text-sm font-medium text-gray-400 pb-3 px-1"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort, rowIndex) => (
                <tr key={cohort.cohort}>
                  <td className="text-sm text-white py-1 pr-4 whitespace-nowrap">
                    {cohort.cohort}
                  </td>
                  <td className="text-center text-sm text-gray-400 py-1 px-2">
                    {cohort.size.toLocaleString()}
                  </td>
                  {displayPeriods.map((_, colIndex) => {
                    const value = cohort.retention[colIndex]
                    const hasValue = value !== undefined && value !== null

                    return (
                      <td key={colIndex} className="p-1">
                        <div
                          className={cn(
                            "w-12 h-8 flex items-center justify-center rounded text-xs font-medium transition-colors",
                            hasValue ? getRetentionColor(value) : "bg-gray-800/50",
                            hasValue ? getTextColor(value) : "text-gray-600"
                          )}
                        >
                          {hasValue ? `${value.toFixed(0)}%` : "-"}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500/80" />
              <span>0-20%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-500/80" />
              <span>20-40%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500/80" />
              <span>40-60%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-600/80" />
              <span>60-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>80-100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CohortHeatmap
