"use client"

/**
 * Client component that applies the Performance API polyfill
 * to fix React 19 + Radix UI Slot component error
 * 
 * This runs immediately when the component mounts to ensure
 * the polyfill is active before any Radix UI components render
 */
export function PerformancePolyfill() {
  if (typeof window !== 'undefined') {
    const originalMeasure = performance.measure.bind(performance)
    
    performance.measure = function(name: string, startMark?: string, endMark?: string) {
      try {
        return originalMeasure(name, startMark, endMark)
      } catch (error) {
        // Suppress the negative timestamp error for Slot.SlotClone
        if (
          error instanceof TypeError &&
          (error.message.includes('cannot have a negative time stamp') ||
           error.message.includes('Slot.SlotClone'))
        ) {
          // Silently ignore this error in development
          if (process.env.NODE_ENV === 'development') {
            // Suppress the error - it's harmless
            return
          }
        }
        // Re-throw other errors
        throw error
      }
    }
  }

  return null
}

