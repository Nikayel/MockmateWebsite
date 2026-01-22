import React from "react"
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

interface ZoomContainerProps {
  children: React.ReactNode
  zoomInStart: number
  zoomInEnd: number
  zoomOutStart?: number
  zoomOutEnd?: number
  maxScale?: number
  focusX?: number
  focusY?: number
}

export const ZoomContainer: React.FC<ZoomContainerProps> = ({
  children,
  zoomInStart,
  zoomInEnd,
  zoomOutStart,
  zoomOutEnd,
  maxScale = 1.5,
  focusX = 50,
  focusY = 50,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Zoom in animation
  const zoomInScale = spring({
    frame: Math.max(0, frame - zoomInStart),
    fps,
    config: { damping: 20, stiffness: 80 },
    from: 1,
    to: maxScale,
    durationInFrames: zoomInEnd - zoomInStart,
  })

  // Zoom out animation (if specified)
  let finalScale = zoomInScale
  if (zoomOutStart !== undefined && zoomOutEnd !== undefined && frame >= zoomOutStart) {
    const zoomOutScale = spring({
      frame: Math.max(0, frame - zoomOutStart),
      fps,
      config: { damping: 20, stiffness: 80 },
      from: maxScale,
      to: 1,
      durationInFrames: zoomOutEnd - zoomOutStart,
    })
    finalScale = frame < zoomOutStart ? zoomInScale : zoomOutScale
  }

  // Clamp scale
  const scale = interpolate(finalScale, [1, maxScale], [1, maxScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: `${focusX}% ${focusY}%`,
      }}
    >
      {children}
    </div>
  )
}

interface PulseHighlightProps {
  children: React.ReactNode
  startFrame: number
  color?: string
}

export const PulseHighlight: React.FC<PulseHighlightProps> = ({
  children,
  startFrame,
  color = "#6366f1",
}) => {
  const frame = useCurrentFrame()
  const relativeFrame = Math.max(0, frame - startFrame)

  const pulseOpacity = interpolate(relativeFrame % 45, [0, 22, 45], [0.6, 0.2, 0.6], {
    extrapolateRight: "clamp",
  })

  const pulseScale = interpolate(relativeFrame % 45, [0, 22, 45], [1, 1.05, 1], {
    extrapolateRight: "clamp",
  })

  const showHighlight = frame >= startFrame

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {showHighlight && (
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: 12,
            border: `2px solid ${color}`,
            boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}20`,
            opacity: pulseOpacity,
            transform: `scale(${pulseScale})`,
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </div>
  )
}
