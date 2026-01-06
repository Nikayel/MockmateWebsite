import { useRef, useEffect, useCallback } from "react"

/**
 * Custom hook to trap focus within a modal for accessibility
 * Ensures keyboard users can't tab outside the modal
 *
 * @param isActive - Whether the focus trap is active
 * @returns Object containing containerRef and handleKeyDown handler
 *
 * @example
 * ```tsx
 * const { containerRef, handleKeyDown } = useFocusTrap(isOpen)
 *
 * <div ref={containerRef} onKeyDown={handleKeyDown}>
 *   // Modal content
 * </div>
 * ```
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus the first focusable element in the modal
    const container = containerRef.current
    if (container) {
      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }

    // Cleanup: restore focus when modal closes
    return () => {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Shift+Tab on first element -> go to last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
    // Tab on last element -> go to first
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }, [])

  return { containerRef, handleKeyDown }
}
