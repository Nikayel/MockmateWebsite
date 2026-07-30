/**
 * One place that knows how to call an authenticated API route from the browser.
 *
 * 56 files hand-roll `getIdToken()` then `fetch(url, { headers: { Authorization } })`.
 * Two of those check for a 401. That gap is the bug this module exists to close:
 * Firebase ID tokens expire after roughly an hour, and `getIdToken()` returns a
 * cached token until it does, so the common failure is a request rejected with 401
 * that a single forced token refresh would have fixed. Hand-rolled call sites
 * surface it as a generic error toast or a silently empty screen instead.
 *
 * `authedFetch` retries exactly once with a force-refreshed token, and only when
 * the first attempt could plausibly have used a stale one. If the retry still
 * fails, it reports `needsReauth` so the caller can prompt a sign-in rather than
 * pretending the data is empty.
 *
 * Deliberately free of React and Firebase imports so it can be unit-tested against
 * a fake token provider. `useAuthedFetch` binds it to the signed-in user.
 */

/** Supplies a bearer token; `forceRefresh` must bypass any cache. */
export type TokenProvider = (forceRefresh: boolean) => Promise<string | null>

export interface AuthedFetchResult<T> {
  /** The request completed with a 2xx status. */
  ok: boolean
  /** HTTP status, or 0 when the request never reached the server. */
  status: number
  data?: T
  /** Human-readable failure reason. Present whenever `ok` is false. */
  error?: string
  /**
   * Authentication failed and a fresh token did not help, so the session is
   * genuinely no longer valid. Callers should prompt re-authentication instead of
   * rendering an empty state.
   */
  needsReauth: boolean
}

/** Statuses that mean "your credentials were rejected", as opposed to any other failure. */
const AUTH_FAILURE_STATUSES = new Set([401, 403])

/**
 * Pull the most useful message out of an error body.
 *
 * Routes in this codebase are not consistent: 44 return `{ error }`, 23 return
 * `{ success: false, error }`, and 6 return `{ error, message }`. Rather than
 * force a migration of every handler, read all three shapes here.
 */
function extractError(body: unknown, status: number, statusText: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.message === "string" && record.message.trim()) return record.message
    if (typeof record.error === "string" && record.error.trim()) return record.error
  }
  return statusText ? `HTTP ${status}: ${statusText}` : `HTTP ${status}`
}

async function readBody(response: Response): Promise<unknown> {
  // A 204, an empty body, or an HTML error page from an edge proxy must not throw.
  try {
    const text = await response.text()
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch {
    return undefined
  }
}

export interface AuthedFetchOptions extends RequestInit {
  tokenProvider: TokenProvider
  /** Injected in tests; defaults to global fetch. */
  fetchImpl?: typeof fetch
}

/**
 * Fetch `url` with a bearer token, retrying once on an auth failure with a fresh token.
 *
 * Never throws: transport errors and non-2xx responses both come back as a result
 * with `ok: false`, so call sites cannot forget a try/catch and lose the error.
 */
export async function authedFetch<T = unknown>(
  url: string,
  options: AuthedFetchOptions
): Promise<AuthedFetchResult<T>> {
  const { tokenProvider, fetchImpl, ...init } = options
  const doFetch = fetchImpl ?? fetch

  const attempt = async (forceRefresh: boolean): Promise<AuthedFetchResult<T>> => {
    let token: string | null
    try {
      token = await tokenProvider(forceRefresh)
    } catch (error) {
      return {
        ok: false,
        status: 0,
        needsReauth: true,
        error: error instanceof Error ? error.message : "Could not obtain an auth token",
      }
    }

    if (!token) {
      return { ok: false, status: 0, needsReauth: true, error: "Not signed in" }
    }

    let response: Response
    try {
      response = await doFetch(url, {
        ...init,
        headers: {
          // Spread first so an explicit Authorization or Content-Type still wins.
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
      })
    } catch (error) {
      // Offline, DNS failure, CORS. Not an auth problem, so do not prompt re-auth.
      return {
        ok: false,
        status: 0,
        needsReauth: false,
        error: error instanceof Error ? error.message : "Network request failed",
      }
    }

    const body = await readBody(response)

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        needsReauth: AUTH_FAILURE_STATUSES.has(response.status),
        error: extractError(body, response.status, response.statusText),
      }
    }

    return { ok: true, status: response.status, data: body as T, needsReauth: false }
  }

  const first = await attempt(false)

  // Retry only a rejected-credentials status, and only once. A stale cached token is
  // the overwhelmingly common cause; anything else (a genuine permission failure) will
  // fail again and fall through with needsReauth already set.
  if (AUTH_FAILURE_STATUSES.has(first.status)) {
    return attempt(true)
  }

  return first
}

/** Convenience for the common JSON POST/PUT/DELETE shape. */
export async function authedJsonFetch<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
  options: AuthedFetchOptions
): Promise<AuthedFetchResult<T>> {
  return authedFetch<T>(url, {
    ...options,
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
