"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, ChevronUp } from "lucide-react"

/**
 * Collapsible section of the admin user-profile drawer. Extracted from UserProfileDrawer so
 * sibling sections (LearnUsageSection) can share it without importing the drawer itself.
 */
export function DrawerSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-gray-800 p-3 transition-colors hover:bg-gray-700"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#c4703f]" />
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-900/50 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
