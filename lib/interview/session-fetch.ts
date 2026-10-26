/** Only the public deployment identifier is inlined; no credentials or runtime discovery. */
function deploymentForPath(path: string): string | undefined {
  const deploymentId = process.env.NEXT_PUBLIC_SESSION_DEPLOYMENT_ID
  // Never attach the pin to an external origin or to server-side requests.
  if (
    !deploymentId ||
    typeof window === "undefined" ||
    !path.startsWith("/") ||
    path.startsWith("//")
  ) {
    return undefined
  }
  if (new URL(path, window.location.origin).origin !== window.location.origin) return undefined
  return deploymentId
}

/** Public Worker URLs cannot carry fetch headers; use the matching query pin. */
export function sessionAssetUrl(path: string): string {
  const deploymentId = deploymentForPath(path)
  if (!deploymentId) return path
  const url = new URL(path, window.location.origin)
  url.searchParams.set("dpl", deploymentId)
  return `${url.pathname}${url.search}${url.hash}`
}

export function sessionFetch(path: string, init?: RequestInit): Promise<Response> {
  const deploymentId = deploymentForPath(path)
  if (!deploymentId) return fetch(path, init)
  const headers = new Headers(init?.headers)
  headers.set("x-deployment-id", deploymentId)
  // Do not retry mutations here: the server may already have processed them.
  return fetch(path, { ...init, headers })
}
