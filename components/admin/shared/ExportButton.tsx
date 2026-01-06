"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { exportToCSV } from "@/lib/admin"
import { logger } from "@/lib/logger"

interface ExportButtonProps {
  data: any[]
  filename: string
  label?: string
  disabled?: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function ExportButton({
  data,
  filename,
  label = "Export CSV",
  disabled = false,
  variant = "outline",
  size = "sm",
  className = "",
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (data.length === 0) {
      alert("No data to export")
      return
    }

    setExporting(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 100))
      exportToCSV(data, filename)
    } catch (error) {
      logger.error("Export failed", { error, filename, rowCount: data.length })
      alert("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      size={size}
      disabled={disabled || exporting || data.length === 0}
      className={className}
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  )
}

interface ExportMenuProps {
  exports: Array<{
    label: string
    data: any[]
    filename: string
  }>
}

export function ExportMenu({ exports }: ExportMenuProps) {
  return (
    <div className="flex gap-2">
      {exports.map((exp, index) => (
        <ExportButton
          key={index}
          data={exp.data}
          filename={exp.filename}
          label={exp.label}
        />
      ))}
    </div>
  )
}
