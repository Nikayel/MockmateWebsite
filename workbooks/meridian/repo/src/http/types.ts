import type { MeridianConfig } from "../config"

/** What a caller passes to `App.inject()` - the same shape a real integration test would use. */
export interface InjectRequest {
  method: string
  url: string
  headers?: Record<string, string>
  payload?: unknown
}

export interface InjectResponse {
  statusCode: number
  headers: Record<string, string>
  /** The raw response body, always a string - parse it yourself, or call `json()`. */
  body: string
  /** Parses `body` as JSON. Throws if the handler never set a body, or set one that was not
   * valid JSON in the first place. */
  json: <T = unknown>() => T
}

/**
 * What a route handler actually sees. `body` is `any` - nothing upstream has validated or
 * narrowed it, so whatever the caller sent is whatever the handler gets.
 */
export interface HandlerRequest {
  method: string
  url: string
  params: Record<string, string>
  query: Record<string, string>
  headers: Record<string, string>
  body: any
}

export interface HandlerResponse {
  statusCode: number
  headers?: Record<string, string>
  body?: unknown
}

export type RouteHandler = (req: HandlerRequest) => HandlerResponse | Promise<HandlerResponse>

export interface App {
  get(path: string, handler: RouteHandler): void
  post(path: string, handler: RouteHandler): void
  inject(request: InjectRequest): Promise<InjectResponse>
  config: MeridianConfig
}
