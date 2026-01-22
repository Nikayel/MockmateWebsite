import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

/**
 * RoadmapScene - Company + Date based personalized prep roadmap
 *
 * Shows how we generate a custom study plan based on:
 * 1. Target company (e.g., Google, Meta)
 * 2. Interview date
 * 3. Current skill level
 *
 * The roadmap shows week-by-week breakdown of what to study
 */

interface WeekCardProps {
  week: number
  title: string
  topics: string[]
  hours: number
  status: "completed" | "current" | "upcoming"
  delay: number
}

const WeekCard: React.FC<WeekCardProps> = ({ week, title, topics, hours, status, delay }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const y = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 15, stiffness: 100 },
    from: 30,
    to: 0,
  })

  const statusColors = {
    completed: { bg: "#22c55e15", border: "#22c55e40", accent: "#22c55e" },
    current: { bg: "#6366f120", border: "#6366f160", accent: "#6366f1" },
    upcoming: { bg: "#1a1a1a", border: "#333", accent: "#6b7280" },
  }

  const colors = statusColors[status]
  const pulseScale = status === "current" ? interpolate(frame % 40, [0, 20, 40], [1, 1.02, 1]) : 1

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${pulseScale})`,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 20,
        width: 260,
        position: "relative",
      }}
    >
      {status === "current" && (
        <div
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 20,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          THIS WEEK
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            color: colors.accent,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Week {week}
        </div>
        <div
          style={{
            color: "#9ca3af",
            fontSize: 12,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {hours}h
        </div>
      </div>

      <div
        style={{
          color: status === "upcoming" ? "#9ca3af" : "#fff",
          fontSize: 17,
          fontWeight: 600,
          fontFamily: "Inter, system-ui, sans-serif",
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {topics.map((topic, i) => (
          <div
            key={i}
            style={{
              background: status === "upcoming" ? "#222" : `${colors.accent}20`,
              color: status === "upcoming" ? "#6b7280" : colors.accent,
              fontSize: 11,
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: 6,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {topic}
          </div>
        ))}
      </div>

      {status === "completed" && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#22c55e",
            fontSize: 12,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <span>✓</span> Completed
        </div>
      )}
    </div>
  )
}

export const RoadmapScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Input form animation (frames 0-60)
  const formOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  })

  const formScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
    from: 0.95,
    to: 1,
  })

  // Company selection animation
  const companyHighlight = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Date selection animation
  const dateHighlight = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Generate button animation
  const buttonPulse =
    frame > 50 && frame < 70 ? interpolate(frame % 15, [0, 7, 15], [1, 1.05, 1]) : 1

  // Transition to roadmap (frames 70-90)
  const formFadeOut = interpolate(frame, [70, 85], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const roadmapFadeIn = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Zoom effect for roadmap reveal
  const zoomScale = interpolate(frame, [85, 110, 180, 220], [0.9, 1, 1.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const zoomX = interpolate(frame, [85, 110, 180, 220], [50, 50, 35, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Weekly roadmap data
  const weeks: Omit<WeekCardProps, "delay">[] = [
    {
      week: 1,
      title: "Foundations",
      topics: ["Arrays", "Hash Maps", "Two Pointers"],
      hours: 15,
      status: "completed",
    },
    {
      week: 2,
      title: "Core Patterns",
      topics: ["Binary Search", "Sliding Window", "Recursion"],
      hours: 18,
      status: "current",
    },
    {
      week: 3,
      title: "Advanced Structures",
      topics: ["Trees", "Graphs", "Heaps"],
      hours: 20,
      status: "upcoming",
    },
    {
      week: 4,
      title: "Google Focus",
      topics: ["System Design", "DP", "Mock Interviews"],
      hours: 22,
      status: "upcoming",
    },
  ]

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.06) 0%, transparent 40%),
          #0a0a0a
        `,
        overflow: "hidden",
      }}
    >
      {/* Phase 1: Input Form */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: formFadeOut,
          pointerEvents: formFadeOut < 0.5 ? "none" : "auto",
        }}
      >
        <div
          style={{
            opacity: formOpacity,
            transform: `scale(${formScale})`,
            background: "#111",
            borderRadius: 24,
            padding: 48,
            border: "1px solid #222",
            width: 500,
            boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: 36,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 8,
              }}
            >
              Create Your Roadmap
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#9ca3af",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              We'll build a personalized study plan
            </div>
          </div>

          {/* Company selector */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 10,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Target Company
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
              }}
            >
              {[
                { name: "Google", color: "#4285f4", selected: true },
                { name: "Meta", color: "#0668E1", selected: false },
                { name: "Amazon", color: "#ff9900", selected: false },
              ].map((company) => (
                <div
                  key={company.name}
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background:
                      company.selected && companyHighlight > 0.5 ? `${company.color}20` : "#1a1a1a",
                    border:
                      company.selected && companyHighlight > 0.5
                        ? `2px solid ${company.color}`
                        : "1px solid #333",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: company.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {company.name[0]}
                  </div>
                  <span
                    style={{
                      color: company.selected && companyHighlight > 0.5 ? "#fff" : "#9ca3af",
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {company.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Date selector */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 10,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Interview Date
            </div>
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: dateHighlight > 0.5 ? "#6366f115" : "#1a1a1a",
                border: dateHighlight > 0.5 ? "2px solid #6366f1" : "1px solid #333",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 20 }}>📅</span>
                <span
                  style={{
                    color: dateHighlight > 0.5 ? "#fff" : "#9ca3af",
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  February 15, 2025
                </span>
              </div>
              <span
                style={{
                  color: "#f59e0b",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                4 weeks away
              </span>
            </div>
          </div>

          {/* Generate button */}
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: 12,
              padding: "18px 24px",
              textAlign: "center",
              transform: `scale(${buttonPulse})`,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Generate My Roadmap →
            </span>
          </div>
        </div>
      </div>

      {/* Phase 2: Generated Roadmap */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: roadmapFadeIn,
          transform: `scale(${zoomScale})`,
          transformOrigin: `${zoomX}% 50%`,
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#4285f4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                G
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Your Google Interview Roadmap
              </div>
            </div>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 18,
                fontFamily: "Inter, system-ui, sans-serif",
                marginLeft: 54,
              }}
            >
              4-week personalized study plan • 75 hours total
            </div>
          </div>

          {/* Progress indicator */}
          <div
            style={{
              background: "#111",
              borderRadius: 16,
              padding: "16px 24px",
              border: "1px solid #222",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  color: "#6b7280",
                  fontSize: 12,
                  fontFamily: "Inter, system-ui, sans-serif",
                  marginBottom: 4,
                }}
              >
                Progress
              </div>
              <div
                style={{
                  color: "#22c55e",
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                25%
              </div>
            </div>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: `conic-gradient(#22c55e 90deg, #222 90deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                1/4
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 60,
            right: 60,
          }}
        >
          {/* Connection line */}
          <div
            style={{
              position: "absolute",
              top: 80,
              left: 130,
              right: 130,
              height: 3,
              background: "#222",
            }}
          >
            <div
              style={{
                width: "25%",
                height: "100%",
                background: "linear-gradient(90deg, #22c55e, #6366f1)",
              }}
            />
          </div>

          {/* Week cards */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {weeks.map((week, i) => (
              <WeekCard key={i} {...week} delay={100 + i * 20} />
            ))}
          </div>
        </div>

        {/* Today's focus panel */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 60,
            right: 60,
            background: "linear-gradient(135deg, #1a1a2e, #111)",
            borderRadius: 20,
            padding: 28,
            border: "1px solid #6366f140",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: interpolate(frame, [180, 200], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div>
            <div
              style={{
                color: "#a5b4fc",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Today's Focus
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Binary Search Patterns • 3 problems scheduled
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: 12,
              padding: "14px 28px",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Start Session →
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
