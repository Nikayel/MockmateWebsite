import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Logo animation
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })

  // CTA text animation
  const ctaOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const ctaY = interpolate(frame, [20, 40], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Button animation
  const buttonOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const buttonScale = spring({
    frame: Math.max(0, frame - 40),
    fps,
    config: { damping: 10, stiffness: 150 },
  })

  // Price tag animation
  const priceOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Pulsing glow effect on button
  const glowIntensity = interpolate(Math.sin(frame * 0.1) * 0.5 + 0.5, [0, 1], [0.3, 0.6])

  // Gradient rotation
  const gradientRotation = interpolate(frame, [0, 120], [0, 360])

  return (
    <AbsoluteFill
      style={{
        background: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Animated gradient background */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `conic-gradient(from ${gradientRotation}deg, #6366f1, #a855f7, #ec4899, #6366f1)`,
          filter: "blur(150px)",
          opacity: 0.2,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke="url(#ctaGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <defs>
            <linearGradient id="ctaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span
          style={{
            fontSize: 48,
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

      {/* CTA Text */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          fontSize: 52,
          fontWeight: 700,
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          marginBottom: 20,
          maxWidth: 900,
          lineHeight: 1.2,
        }}
      >
        Start Your Interview Prep Journey
      </div>

      {/* Subtext */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          fontSize: 24,
          color: "#9ca3af",
          fontFamily: "Inter, system-ui, sans-serif",
          marginBottom: 48,
        }}
      >
        20+ free problems. No credit card required.
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: buttonOpacity,
          transform: `scale(${buttonScale})`,
          position: "relative",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            borderRadius: 20,
            filter: "blur(20px)",
            opacity: glowIntensity,
          }}
        />
        <div
          style={{
            position: "relative",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            borderRadius: 16,
            padding: "24px 64px",
            fontSize: 24,
            fontWeight: 600,
            color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
            cursor: "pointer",
          }}
        >
          Try Free Now
        </div>
      </div>

      {/* Price comparison */}
      <div
        style={{
          opacity: priceOpacity,
          marginTop: 48,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#ef4444",
              fontSize: 18,
              fontFamily: "Inter, system-ui, sans-serif",
              textDecoration: "line-through",
              marginBottom: 4,
            }}
          >
            Human Mock: $150/session
          </span>
        </div>
        <div
          style={{
            width: 2,
            height: 40,
            background: "#333",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#22c55e",
              fontSize: 24,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            CodeSparring: $25/month
          </span>
          <span
            style={{
              color: "#6b7280",
              fontSize: 14,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Unlimited AI interviews
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
