"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  label: string
  width?: string
  align?: "left" | "center" | "right"
  render?: (value: any, row: T) => ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onRefresh?: () => void
  refreshing?: boolean
  pagination?: {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
  }
  emptyMessage?: string
  actions?: ReactNode
  rowClassName?: (row: T) => string
}

export function DataTable<T>({
  title,
  description,
  icon: Icon,
  data,
  columns,
  keyExtractor,
  loading = false,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  onRefresh,
  refreshing = false,
  pagination,
  emptyMessage = "No data found",
  actions,
  rowClassName,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      {(title || description || searchable || onRefresh || actions) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <CardTitle className="text-white flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5 text-[#c4703f]" />}
                  {title}
                </CardTitle>
              )}
              {description && (
                <CardDescription className="text-gray-400 mt-1">
                  {description}
                </CardDescription>
              )}
            </div>

            <div className="flex items-center gap-2">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              )}

              {actions}

              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="border-gray-700 text-gray-400 hover:text-white"
                >
                  <RefreshCw
                    className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")}
                  />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#c4703f]" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{emptyMessage}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={cn(
                          "py-3 px-4 text-gray-400 font-medium text-sm",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right",
                          column.align !== "center" && column.align !== "right" && "text-left",
                          column.sortable && "cursor-pointer hover:text-white"
                        )}
                        style={column.width ? { width: column.width } : undefined}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        <div className="flex items-center gap-1">
                          {column.label}
                          {column.sortable && sortColumn === column.key && (
                            <span className="text-[#c4703f]">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr
                      key={keyExtractor(row)}
                      className={cn(
                        "border-b border-gray-800/50 hover:bg-gray-800/30",
                        rowClassName?.(row)
                      )}
                    >
                      {columns.map((column) => {
                        const value = (row as any)[column.key]
                        return (
                          <td
                            key={column.key}
                            className={cn(
                              "py-3 px-4",
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right"
                            )}
                          >
                            {column.render ? column.render(value, row) : value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <div className="text-sm text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="border-gray-700 text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="border-gray-700 text-gray-400 hover:text-white"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function renderBadge(
  text: string,
  variant: "default" | "success" | "warning" | "error" = "default"
) {
  const colorMap = {
    default: "bg-gray-600/20 text-gray-400 border-gray-600/30",
    success: "bg-green-600/20 text-green-400 border-green-600/30",
    warning: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
    error: "bg-red-600/20 text-red-400 border-red-600/30",
  }

  return <Badge className={colorMap[variant]}>{text}</Badge>
}
