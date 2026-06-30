import { LevelCard } from "./LevelCard"
import type { PythonLevel } from "@/lib/tutorials/types"

/** The four Python levels as a connected path. Pure presentational over `listLevels()`. */
export function LevelSelector({ levels }: { levels: PythonLevel[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {levels.map((level) => (
        <LevelCard key={level.id} level={level} />
      ))}
    </div>
  )
}
