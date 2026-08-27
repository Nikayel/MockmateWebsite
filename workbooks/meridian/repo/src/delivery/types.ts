export interface WebhookHttpResponse {
  status: number
}

/**
 * The only way this codebase talks to the outside world. There is no default implementation
 * here that reaches a real socket - every caller has to supply one, which today means tests
 * supply a fake and nothing in production sends a real request yet.
 */
export interface WebhookHttpClient {
  post(url: string, body: string, headers: Record<string, string>): Promise<WebhookHttpResponse>
}
