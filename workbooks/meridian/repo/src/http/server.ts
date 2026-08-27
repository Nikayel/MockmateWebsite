import type {
  App,
  HandlerRequest,
  HandlerResponse,
  InjectRequest,
  InjectResponse,
  RouteHandler,
} from "./types"

interface RegisteredRoute {
  method: string
  segments: string[]
  handler: RouteHandler
}

function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0)
}

/** Returns the route's params if `method`/`segments` match, or `null` if they do not. */
function matchRoute(
  route: RegisteredRoute,
  method: string,
  segments: string[]
): Record<string, string> | null {
  if (route.method !== method) return null
  if (route.segments.length !== segments.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < route.segments.length; i++) {
    const routeSegment = route.segments[i]
    const actualSegment = segments[i]
    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(actualSegment)
    } else if (routeSegment !== actualSegment) {
      return null
    }
  }
  return params
}

function parseQuery(search: string): Record<string, string> {
  const query: Record<string, string> = {}
  if (!search) return query
  for (const pair of search.replace(/^\?/, "").split("&")) {
    if (!pair) continue
    const [key, value = ""] = pair.split("=")
    query[decodeURIComponent(key)] = decodeURIComponent(value)
  }
  return query
}

/** `payload` arrives already-parsed (an object/array) most of the time in tests; a raw JSON
 * string is also accepted and parsed here, matching how a real inject() helper behaves. */
function parseBody(payload: unknown): unknown {
  if (typeof payload !== "string") return payload
  if (payload.length === 0) return undefined
  try {
    return JSON.parse(payload)
  } catch {
    return undefined
  }
}

function toInjectResponse(response: HandlerResponse): InjectResponse {
  const headers = { "content-type": "application/json", ...response.headers }
  const bodyText = response.body === undefined ? "" : JSON.stringify(response.body)
  return {
    statusCode: response.statusCode,
    headers,
    body: bodyText,
    json: <T>() => JSON.parse(bodyText) as T,
  }
}

/**
 * A small, in-process HTTP-shaped app: register routes, then call `inject()` the way a real
 * integration test would. There is no socket anywhere in this file - every route runs
 * entirely in memory, which is also what makes it possible to run this whole app inside a
 * test runner with no network at all.
 */
export function createApp(): App {
  const routes: RegisteredRoute[] = []

  function register(method: string, path: string, handler: RouteHandler): void {
    routes.push({ method, segments: splitPath(path), handler })
  }

  async function inject(request: InjectRequest): Promise<InjectResponse> {
    const [pathname, search = ""] = request.url.split("?")
    const segments = splitPath(pathname)
    const headers = request.headers ?? {}

    let matched: { route: RegisteredRoute; params: Record<string, string> } | undefined
    for (const route of routes) {
      const params = matchRoute(route, request.method, segments)
      if (params) {
        matched = { route, params }
        break
      }
    }

    if (!matched) {
      return toInjectResponse({ statusCode: 404, body: { message: "Not Found" } })
    }

    const handlerRequest: HandlerRequest = {
      method: request.method,
      url: request.url,
      params: matched.params,
      query: parseQuery(search),
      headers,
      body: parseBody(request.payload),
    }

    try {
      const response = await matched.route.handler(handlerRequest)
      return toInjectResponse(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error"
      return toInjectResponse({ statusCode: 500, body: { message } })
    }
  }

  return {
    get: (path, handler) => register("GET", path, handler),
    post: (path, handler) => register("POST", path, handler),
    inject,
  }
}
