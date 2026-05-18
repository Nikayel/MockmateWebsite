import type { VectorDocument } from "../../types"

export function flattenMetadata(doc: VectorDocument): Record<string, any> {
  const flatMetadata: Record<string, any> = {
    ...doc.metadata,
    text: doc.text || "",
  }

  if (doc.metadata?.tags && Array.isArray(doc.metadata.tags)) {
    flatMetadata.tags = doc.metadata.tags.join(",")
  }

  if (doc.metadata?.topPatterns && Array.isArray(doc.metadata.topPatterns)) {
    flatMetadata.topPatterns = doc.metadata.topPatterns.join(",")
  }

  if (
    doc.metadata?.difficultyDistribution &&
    typeof doc.metadata.difficultyDistribution === "object"
  ) {
    const dist = doc.metadata.difficultyDistribution as Record<string, any>
    flatMetadata.difficultyDistribution = `easy:${dist.easy || 0},medium:${dist.medium || 0},hard:${dist.hard || 0}`
  }

  Object.keys(flatMetadata).forEach((key) => {
    const value = flatMetadata[key]
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      flatMetadata[key] = JSON.stringify(value)
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] !== "string") {
      flatMetadata[key] = value.join(",")
    }
  })

  return flatMetadata
}

export function restoreMetadata(metadata: Record<string, any>): Record<string, any> {
  const restored: Record<string, any> = { ...metadata }

  if (typeof restored.tags === "string") {
    restored.tags = restored.tags.split(",").filter(Boolean)
  }

  if (typeof restored.topPatterns === "string") {
    restored.topPatterns = restored.topPatterns.split(",").filter(Boolean)
  }

  if (typeof restored.difficultyDistribution === "string") {
    const dist: Record<string, number> = {}
    restored.difficultyDistribution.split(",").forEach((part: string) => {
      const [key, value] = part.split(":")
      if (key && value) {
        dist[key.trim()] = parseFloat(value.trim()) || 0
      }
    })
    restored.difficultyDistribution = dist
  }

  return restored
}
