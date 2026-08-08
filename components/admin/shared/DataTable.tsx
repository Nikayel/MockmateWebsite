"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { ReactNode, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { sortRows, type SortDirection } from "@/lib/admin/table-sort"

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
  /**
   * Sort server-side instead of in the browser. Supply this whenever the table is
   * paginated: sorting only the rows on the current page looks like a full sort
   * but silently reorders a slice, which is worse than not offering it. When set,
   * the table renders `data` exactly as given and reports the requested order.
   */
  onSort?: (columnKey: string, direction: SortDirection) => void
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
  onSort,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (columnKey: string) => {
    const direction: SortDirection =
      sortColumn === columnKey && sortDirection === "asc" ? "desc" : "asc"
    setSortColumn(columnKey)
    setSortDirection(direction)
    onSort?.(columnKey, direction)
  }

  // Without this the header arrow flipped while the rows below it never moved.
  // A parent that sorts server-side owns the order, so leave its data alone.
  const rows = useMemo(
    () => (onSort ? data : sortRows(data, sortColumn, sortDirection)),
    [data, sortColumn, sortDirection, onSort]
  )

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      {(title || description || searchable || onRefresh || actions) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <CardTitle className="flex items-center gap-2 text-white">
                  {Icon && <Icon className="h-5 w-5 text-[#c4703f]" />}
                  {title}
                </CardTitle>
              )}
              {description && (
                <CardDescription className="mt-1 text-gray-400">{description}</CardDescription>
              )}
            </div>

            <div className="flex items-center gap-2">
              {searchable && (
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-64 border-gray-700 bg-gray-800 pl-10 text-white"
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
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
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
          <div className="py-12 text-center text-gray-400">{emptyMessage}</div>
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
                          "px-4 py-3 text-sm font-medium text-gray-400",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right",
                          column.align !== "center" && column.align !== "right" && "text-left",
                          column.sortable && "cursor-pointer hover:text-white"
                        )}
                        style={column.width ? { width: column.width } : undefined}
                        aria-sort={
                          !column.sortable
                            ? undefined
                            : sortColumn === column.key
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                        }
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(column.key)}
                            className={cn(
                              "flex w-full items-center gap-1 rounded-sm transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:outline-none",
                              column.align === "center" && "justify-center",
                              column.align === "right" && "justify-end"
                            )}
                          >
                            {column.label}
                            <span
                              aria-hidden="true"
                              className={cn(
                                sortColumn === column.key
                                  ? "text-[#c4703f]"
                                  : "text-gray-600 opacity-0 group-hover:opacity-100"
                              )}
                            >
                              {sortColumn === column.key && sortDirection === "desc" ? "↓" : "↑"}
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">{column.label}</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
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
                              "px-4 py-3",
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
              <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
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
                    <ChevronLeft className="mr-1 h-4 w-4" />
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
                    <ChevronRight className="ml-1 h-4 w-4" />
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
