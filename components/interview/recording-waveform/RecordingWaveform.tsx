"use client"

import { useReducedMotion } from "framer-motion"
import { useRecordingWaveform } from "./useRecordingWaveform"

export function RecordingWaveform({ mediaStream }: { mediaStream: MediaStream | null }) {
  const reducedMotion = useReducedMotion()
  const levels = useRecordingWaveform(mediaStream, reducedMotion === true)
  if (!levels) return null

  return (
    <svg
      viewBox="0 0 120 24"
      className="text-accent block h-6 w-full max-w-32 motion-reduce:hidden"
      aria-hidden="true"
      data-recording-waveform
    >
      {levels.map((level, index) => {
        const height = 3 + level * 21
        return (
          <rect
            key={index}
            x={index * 5 + 1}
            y={(24 - height) / 2}
            width="3"
            height={height}
            rx="1.5"
            fill="currentColor"
          />
        )
      })}
    </svg>
  )
}
