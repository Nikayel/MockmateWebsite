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
  const [failed, setFailed] = useState(false)

  const handleExport = async () => {
    // No empty-data guard here: the button below is already disabled at zero rows,
    // so the alert that used to sit here could never fire.
    setExporting(true)
    setFailed(false)

    try {
      await new Promise((resolve) => setTimeout(resolve, 100))
      exportToCSV(data, filename)
    } catch (error) {
      logger.error("Export failed", { error, filename, rowCount: data.length })
      // Reported next to the button rather than through alert(), which blocks the
      // page and loses the context of which export failed.
      setFailed(true)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        onClick={handleExport}
        variant={variant}
        size={size}
        disabled={disabled || exporting || data.length === 0}
        className={className}
      >
        {exporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {failed && (
        <span role="alert" className="text-xs text-red-400">
          Export failed. Nothing was downloaded.
        </span>
      )}
    </div>
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
