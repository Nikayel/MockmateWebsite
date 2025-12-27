"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { useBlogTheme } from "./BlogThemeProvider"

export function BlogThemeToggle() {
  const { theme, setTheme } = useBlogTheme()

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-full transition-all ${
          theme === "light"
            ? "bg-white dark:bg-gray-700 shadow-sm text-amber-500"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-full transition-all ${
          theme === "system"
            ? "bg-white dark:bg-gray-700 shadow-sm text-blue-500"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        aria-label="System preference"
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-full transition-all ${
          theme === "dark"
            ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-500"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  )
}
