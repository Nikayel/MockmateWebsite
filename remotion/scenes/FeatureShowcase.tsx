import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
  gradient: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay, gradient }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const scale = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 12, stiffness: 100 },
    from: 0.8,
    to: 1,
  })

  const y = interpolate(frame, [delay, delay + 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale}) translateY(${y}px)`,
        background: "#111",
        borderRadius: 20,
        padding: 32,
        width: 320,
        border: "1px solid #222",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 15,
          color: "#9ca3af",
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  )
}

export const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame()

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  const titleY = interpolate(frame, [0, 20], [-30, 0], {
    extrapolateRight: "clamp",
  })

  const features = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#fff" strokeWidth="2" />
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="#fff" strokeWidth="2" />
        </svg>
      ),
      title: "Voice Enabled",
      description: "Practice talking through your solution like a real interview",
      delay: 20,
      gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: "Adaptive Hints",
      description: "Get progressive hints from nudges to full explanations",
      delay: 40,
      gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 20V10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 20V4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 20v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: "70+ Scenarios",
      description: "DSA, System Design, Bug Fix from real companies",
      delay: 60,
      gradient: "linear-gradient(135deg, #22c55e, #14b8a6)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: "AI Collaboration",
      description: "Use AI like modern interviews at Meta allow",
      delay: 80,
      gradient: "linear-gradient(135deg, #ec4899, #8b5cf6)",
    },
  ]

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%),
          #0a0a0a
        `,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 50,
      }}
    >
      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 42,
          fontWeight: 700,
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        Everything You Need to Ace Interviews
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "flex",
          gap: 24,
        }}
      >
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
