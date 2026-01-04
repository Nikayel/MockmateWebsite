"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { format, parseISO } from "date-fns"

interface DataSeries {
  key: string
  name: string
  color: string
  stackId?: string
}

interface TimeSeriesChartProps {
  title: string
  subtitle?: string
  data: Array<Record<string, any>>
  series: DataSeries[]
  xAxisKey?: string
  dateFormat?: string
  height?: number
  stacked?: boolean
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  valueFormatter?: (value: number) => string
}

export function TimeSeriesChart({
  title,
  subtitle,
  data,
  series,
  xAxisKey = "date",
  dateFormat = "MMM d",
  height = 300,
  stacked = false,
  loading = false,
  icon: Icon,
  valueFormatter = (v) => v.toLocaleString(),
}: TimeSeriesChartProps) {
  const formatXAxis = (value: string) => {
    try {
      // Handle both ISO strings and pre-formatted dates
      const date = value.includes("T") ? parseISO(value) : new Date(value)
      return format(date, dateFormat)
    } catch {
      return value
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-gray-400 text-sm mb-2">
          {formatXAxis(label)}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={entry.name ?? `tooltip-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-semibold text-white">
              {valueFormatter(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

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
          <div className="animate-pulse">
            <div className="h-[300px] bg-gray-800 rounded" />
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
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {series.map((s) => (
                  <linearGradient
                    key={s.key}
                    id={`gradient-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                tickFormatter={formatXAxis}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                  return value
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {series.length > 1 && (
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => (
                    <span className="text-gray-400 text-sm">{value}</span>
                  )}
                />
              )}
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${s.key})`}
                  stackId={stacked ? "stack" : s.stackId}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default TimeSeriesChart
