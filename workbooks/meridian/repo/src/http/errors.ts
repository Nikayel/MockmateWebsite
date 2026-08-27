import type { HandlerResponse } from "./types"

// No shared error taxonomy yet - every failure path picked its own shape as it was written.
export function notFound(message: string): HandlerResponse {
  return { statusCode: 404, body: { message } }
}

export function badRequest(message: string): HandlerResponse {
  return { statusCode: 400, body: { message } }
}
