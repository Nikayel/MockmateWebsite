export interface PolicyChunk {
  id: string
  text: string
}

/**
 * Not wired into the extractor yet. Returns nothing so callers can start depending on the
 * shape before there is a real policy corpus to search over.
 */
export async function retrievePolicyChunks(
  _tenantId: string,
  _query: string
): Promise<PolicyChunk[]> {
  return []
}
