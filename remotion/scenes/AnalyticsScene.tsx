import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const containerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  const containerScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
    from: 0.9,
    to: 1,
  })

  // Progress bar animations
  const progress1 = interpolate(frame, [30, 70], [0, 85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const progress2 = interpolate(frame, [40, 80], [0, 72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const progress3 = interpolate(frame, [50, 90], [0, 90], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const progress4 = interpolate(frame, [60, 100], [0, 65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Score counter animation
  const scoreValue = Math.round(
    interpolate(frame, [20, 80], [0, 87], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  )

  const skills = [
    { name: "Code Quality", progress: progress1, color: "#6366f1" },
    { name: "Problem Solving", progress: progress2, color: "#22c55e" },
    { name: "Communication", progress: progress3, color: "#f59e0b" },
    { name: "Understanding", progress: progress4, color: "#ec4899" },
  ]

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
          #0a0a0a
        `,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Analytics Dashboard */}
      <div
        style={{
          opacity: containerOpacity,
          transform: `scale(${containerScale})`,
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          gap: 40,
        }}
      >
        {/* Left - Score Circle */}
        <div
          style={{
            background: "#111",
            borderRadius: 24,
            padding: 48,
            border: "1px solid #222",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 320,
          }}
        >
          <div
            style={{
              color: "#9ca3af",
              fontSize: 16,
              fontFamily: "Inter, system-ui, sans-serif",
              marginBottom: 24,
            }}
          >
            Interview Readiness
          </div>
          <div
            style={{
              position: "relative",
              width: 180,
              height: 180,
            }}
          >
            {/* Background circle */}
            <svg width="180" height="180" style={{ position: "absolute", top: 0, left: 0 }}>
              <circle cx="90" cy="90" r="80" fill="none" stroke="#222" strokeWidth="12" />
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(scoreValue / 100) * 502} 502`}
                transform="rotate(-90 90 90)"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            {/* Score text */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {scoreValue}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                / 100
              </span>
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              color: "#22c55e",
              fontSize: 14,
              fontFamily: "Inter, system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            +12 this week
          </div>
        </div>

        {/* Right - Skills breakdown */}
        <div
          style={{
            flex: 1,
            background: "#111",
            borderRadius: 24,
            padding: 40,
            border: "1px solid #222",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              marginBottom: 32,
            }}
          >
            Skills Breakdown
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            {skills.map((skill) => (
              <div key={skill.name}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      color: "#e5e7eb",
                      fontSize: 16,
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {skill.name}
                  </span>
                  <span
                    style={{
                      color: skill.color,
                      fontSize: 16,
                      fontWeight: 600,
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {Math.round(skill.progress)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    background: "#1a1a1a",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${skill.progress}%`,
                      height: "100%",
                      background: skill.color,
                      borderRadius: 5,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          fontSize: 36,
          fontWeight: 600,
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: containerOpacity,
        }}
      >
        Track Your Progress with Detailed Analytics
      </div>
    </AbsoluteFill>
  )
}
