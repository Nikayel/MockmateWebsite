export interface ParsedServerSentEvent {
  event: string
  data: string
}

export interface ServerSentEventParser {
  push(chunk: Uint8Array): ParsedServerSentEvent[]
  finish(): ParsedServerSentEvent[]
}

const DEFAULT_MAX_FRAME_CHARS = 1_000_000
const FRAME_DELIMITER = /\r?\n\r?\n/

function parseFrame(frame: string): ParsedServerSentEvent | null {
  let event = "message"
  const dataLines: string[] = []

  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue

    const separatorIndex = line.indexOf(":")
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1)
    if (value.startsWith(" ")) value = value.slice(1)

    if (field === "event") {
      event = value || "message"
    } else if (field === "data") {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) return null
  return { event, data: dataLines.join("\n") }
}

export function createServerSentEventParser(
  maxFrameChars = DEFAULT_MAX_FRAME_CHARS
): ServerSentEventParser {
  const decoder = new TextDecoder()
  let buffer = ""

  const drain = (): ParsedServerSentEvent[] => {
    const events: ParsedServerSentEvent[] = []
    let delimiter = FRAME_DELIMITER.exec(buffer)

    while (delimiter) {
      const frame = buffer.slice(0, delimiter.index)
      if (frame.length > maxFrameChars) {
        throw new Error("SSE frame exceeded the maximum allowed size")
      }

      buffer = buffer.slice(delimiter.index + delimiter[0].length)
      const event = parseFrame(frame)
      if (event) events.push(event)
      delimiter = FRAME_DELIMITER.exec(buffer)
    }

    if (buffer.length > maxFrameChars) {
      throw new Error("SSE frame exceeded the maximum allowed size")
    }

    return events
  }

  return {
    push(chunk) {
      buffer += decoder.decode(chunk, { stream: true })
      return drain()
    },
    finish() {
      buffer += decoder.decode()
      const events = drain()
      if (buffer.trim()) {
        throw new Error("SSE stream ended with an incomplete event")
      }
      buffer = ""
      return events
    },
  }
}
