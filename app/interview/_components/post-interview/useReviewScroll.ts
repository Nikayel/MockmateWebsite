import { useEffect, useRef, useState } from "react"
import type { ReviewMessage } from "./types"

/** New replies follow the reader only while they're already near the bottom. */
export function useReviewScroll(messages: ReviewMessage[]) {
  const ref = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)

  const scrollToLatest = () => {
    const element = ref.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior: "auto" })
    following.current = true
    setHasNewMessages(false)
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (following.current && ref.current) {
        ref.current.scrollTop = ref.current.scrollHeight
      } else {
        setHasNewMessages(true)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [messages])

  const onScroll = () => {
    const element = ref.current
    if (!element) return
    following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
    if (following.current) setHasNewMessages(false)
  }
  return { ref, onScroll, hasNewMessages, scrollToLatest }
}
