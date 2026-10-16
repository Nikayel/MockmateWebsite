"use client"

import { useEffect, useState } from "react"

export type ScenarioDensity = "cards" | "rows"
const DENSITY_STORAGE_KEY = "mockmate_scenario_density"

/** One preference shared by the discovery toolbar and the results it controls. */
export function useScenarioDensity() {
  const [density, setDensity] = useState<ScenarioDensity>("cards")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DENSITY_STORAGE_KEY)
      if (saved === "cards" || saved === "rows") setDensity(saved)
    } catch {
      // Browser storage can be unavailable; the control still works for this visit.
    }
  }, [])

  const updateDensity = (next: ScenarioDensity) => {
    setDensity(next)
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, next)
    } catch {
      // Persistence is optional, changing the current view is not.
    }
  }

  return { density, updateDensity }
}
