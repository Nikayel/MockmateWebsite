export const VALIDATED_CHAT_STREAM_CONTENT_TYPE = "application/x-ndjson"

export interface ValidatedChatResponse {
  reply: string
  provider: string
  latencyMs?: number
  _debug?: Record<string, unknown>
}

export type ValidatedChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; response: ValidatedChatResponse }

interface CreateValidatedChatStreamOptions {
  /** A small delay makes the already-validated response readable as it arrives. */
  chunkDelayMs?: number
}

function splitForReveal(text: string): string[] {
  const tokens = text.match(/\S+\s*/g)
  if (!tokens) return text ? [text] : []

  const chunks: string[] = []
  let chunk = ""

  for (const token of tokens) {
    if (chunk && chunk.length + token.length > 48) {
      chunks.push(chunk)
      chunk = ""
    }
    chunk += token
  }

  if (chunk) chunks.push(chunk)
  return chunks
}

function serializeEvent(event: ValidatedChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`)
}

function waitForReveal(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

/**
 * Streams a response only after the route has generated and validated its full
 * text. This is a presentation stream, not a raw model-token stream.
 */
export function createValidatedChatStream(
  response: ValidatedChatResponse,
  { chunkDelayMs = 24 }: CreateValidatedChatStreamOptions = {}
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const text of splitForReveal(response.reply)) {
        controller.enqueue(serializeEvent({ type: "delta", text }))
        if (chunkDelayMs > 0) await waitForReveal(chunkDelayMs)
      }

      controller.enqueue(serializeEvent({ type: "done", response }))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": VALIDATED_CHAT_STREAM_CONTENT_TYPE,
      "Cache-Control": "no-cache, no-transform",
    },
  })
}

export async function readValidatedChatStream(
  response: Response,
  onDelta: (text: string) => void
): Promise<ValidatedChatResponse> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("Validated chat stream has no body")

  const decoder = new TextDecoder()
  let remainder = ""
  let completeResponse: ValidatedChatResponse | null = null

  const consumeLine = (line: string) => {
    if (!line) return
    const event = JSON.parse(line) as ValidatedChatStreamEvent
    if (event.type === "delta") {
      onDelta(event.text)
    } else {
      completeResponse = event.response
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    remainder += decoder.decode(value, { stream: !done })
    const lines = remainder.split("\n")
    remainder = lines.pop() || ""
    lines.forEach(consumeLine)

    if (done) break
  }

  if (remainder) consumeLine(remainder)
  if (!completeResponse) throw new Error("Validated chat stream ended without a completion event")

  return completeResponse
}
