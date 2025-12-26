"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface DataItem {
  name: string
  value: number
  color?: string
}

interface DistributionChartProps {
  title: string
  subtitle?: string
  data: DataItem[]
  type?: "pie" | "bar" | "horizontal-bar"
  height?: number
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  showLegend?: boolean
  showValues?: boolean
  valueFormatter?: (value: number) => string
}

const DEFAULT_COLORS = [
  "#00d9ff", // cyan
  "#00ff88", // green
  "#FBBF24", // yellow
  "#F97316", // orange
  "#EF4444", // red
  "#A855F7", // purple
  "#EC4899", // pink
  "#6B7280", // gray
]

export function DistributionChart({
  title,
  subtitle,
  data,
  type = "pie",
  height = 300,
  loading = false,
  icon: Icon,
  showLegend = true,
  showValues = true,
  valueFormatter = (v) => v.toLocaleString(),
}: DistributionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    const item = payload[0].payload
    const total = data.reduce((sum, d) => sum + d.value, 0)
    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color || DEFAULT_COLORS[0] }}
          />
          <span className="text-gray-300">{item.name}</span>
        </div>
        <div className="mt-1 text-white font-semibold">
          {valueFormatter(item.value)} ({percentage}%)
        </div>
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

  // Add colors to data if not present
  const coloredData = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }))

  const total = data.reduce((sum, d) => sum + d.value, 0)

  const renderChart = () => {
    if (type === "pie") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={coloredData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={showValues ? ({ name, value }) => `${name}: ${valueFormatter(value)}` : undefined}
              labelLine={false}
            >
              {coloredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => (
                  <span className="text-gray-400 text-sm">{value}</span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (type === "horizontal-bar") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={coloredData}
            layout="vertical"
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" stroke="#6B7280" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6B7280"
              fontSize={12}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {coloredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    // Default vertical bar chart
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={coloredData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {coloredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}

export default DistributionChart
