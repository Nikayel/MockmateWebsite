export interface QueryResult<T> {
  rows: T[]
}

/**
 * The only thing every repository is allowed to assume about persistence. `src/db/memory-db.ts`
 * is the only implementation today; a real Postgres-backed one arrives later without this
 * interface needing to change.
 */
export interface DbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>
}
