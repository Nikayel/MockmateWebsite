/**
 * A placeholder signature - not HMAC, just enough of a keyed digest to prove the wiring works
 * end to end for a tenant's shared secret.
 */
export function signPayload(payload: string, secret: string): string {
  const combined = `${secret}:${payload}`
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}
