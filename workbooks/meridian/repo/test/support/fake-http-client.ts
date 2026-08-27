import type { WebhookHttpClient, WebhookHttpResponse } from "../../src/delivery/types"

export interface FakeHttpCall {
  url: string
  body: string
  headers: Record<string, string>
}

export interface FakeHttpClient extends WebhookHttpClient {
  calls: FakeHttpCall[]
}

/** Records every call instead of reaching a real socket - there is no real network available
 * to this test suite anyway. */
export function createFakeHttpClient(
  response: WebhookHttpResponse = { status: 200 }
): FakeHttpClient {
  const calls: FakeHttpCall[] = []
  return {
    calls,
    async post(url, body, headers) {
      calls.push({ url, body, headers })
      return response
    },
  }
}
