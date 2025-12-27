"use client"

import { createContext, useContext, useEffect, useState } from "react"

type BlogTheme = "light" | "dark" | "system"

interface BlogThemeContextType {
  theme: BlogTheme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: BlogTheme) => void
}

const BlogThemeContext = createContext<BlogThemeContextType | undefined>(undefined)

export function BlogThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<BlogTheme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem("blog-theme") as BlogTheme | null
    if (saved) {
      setThemeState(saved)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const updateResolvedTheme = () => {
      if (theme === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light")
      } else {
        setResolvedTheme(theme)
      }
    }

    updateResolvedTheme()
    mediaQuery.addEventListener("change", updateResolvedTheme)

    return () => mediaQuery.removeEventListener("change", updateResolvedTheme)
  }, [theme])

  const setTheme = (newTheme: BlogTheme) => {
    setThemeState(newTheme)
    localStorage.setItem("blog-theme", newTheme)
  }

  return (
    <BlogThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <div data-blog-theme={resolvedTheme}>{children}</div>
    </BlogThemeContext.Provider>
  )
}

export function useBlogTheme() {
  const context = useContext(BlogThemeContext)
  if (!context) {
    throw new Error("useBlogTheme must be used within BlogThemeProvider")
  }
  return context
}
