import type { HandlerResponse } from "./types"

// Each helper returns its own response shape.
export function notFound(message: string): HandlerResponse {
  return { statusCode: 404, body: { message } }
}

export function badRequest(message: string): HandlerResponse {
  return { statusCode: 400, body: { message } }
}
