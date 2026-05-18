import type { QueryOptions } from "../../types"

export function buildMetadataFilter(
  filter: QueryOptions["filter"]
): Record<string, any> | undefined {
  if (!filter) return undefined

  const conditions: Record<string, any>[] = []

  if (filter.type) {
    conditions.push({ type: { $eq: filter.type } })
  }

  if (filter.userId) {
    conditions.push({
      $or: [{ userId: { $eq: filter.userId } }, { user_id: { $eq: filter.userId } }],
    })
  }

  if (filter.problemType) {
    conditions.push({ problemType: { $eq: filter.problemType } })
  }

  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]
  return { $and: conditions }
}
