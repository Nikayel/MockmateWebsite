import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Logo animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  // Tagline animation (appears after logo)
  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const taglineY = interpolate(frame, [30, 50], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Gradient background animation
  const gradientRotation = interpolate(frame, [0, 150], [0, 360])

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
          #0a0a0a
        `,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Animated gradient orb */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `conic-gradient(from ${gradientRotation}deg, #6366f1, #a855f7, #ec4899, #6366f1)`,
          filter: "blur(100px)",
          opacity: 0.3,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke="url(#gradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            background: "linear-gradient(135deg, #fff 0%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          CodeSparring
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          marginTop: 40,
          fontSize: 36,
          color: "#e5e7eb",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 500,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        AI-Powered Coding Interview Practice
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          marginTop: 24,
          fontSize: 24,
          color: "#9ca3af",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 400,
        }}
      >
        Practice like it's the real thing
      </div>
    </AbsoluteFill>
  )
}
