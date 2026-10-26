/** Only the public deployment identifier is inlined; no credentials or runtime discovery. */
export function sessionFetch(path: string, init?: RequestInit): Promise<Response> {
  const deploymentId = process.env.NEXT_PUBLIC_SESSION_DEPLOYMENT_ID
  // Never attach the pin to an external origin or to server-side requests.
  if (
    !deploymentId ||
    typeof window === "undefined" ||
    !path.startsWith("/") ||
    path.startsWith("//")
  ) {
    return fetch(path, init)
  }
  if (new URL(path, window.location.origin).origin !== window.location.origin)
    return fetch(path, init)
  const headers = new Headers(init?.headers)
  headers.set("x-deployment-id", deploymentId)
  // Do not retry mutations here: the server may already have processed them.
  return fetch(path, { ...init, headers })
}
