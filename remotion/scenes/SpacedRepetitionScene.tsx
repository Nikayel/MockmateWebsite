import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

interface CalendarDayProps {
  day: number
  isToday?: boolean
  isScheduled?: boolean
  isPast?: boolean
  difficulty?: "easy" | "medium" | "hard"
  delay: number
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isToday,
  isScheduled,
  isPast,
  difficulty,
  delay,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const scale = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 15, stiffness: 150 },
    from: 0.5,
    to: 1,
  })

  const difficultyColors = {
    easy: "#22c55e",
    medium: "#f59e0b",
    hard: "#ef4444",
  }

  const pulseScale = isToday ? interpolate(frame % 30, [0, 15, 30], [1, 1.05, 1]) : 1

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale * pulseScale})`,
        width: 52,
        height: 52,
        borderRadius: 12,
        background: isToday
          ? "linear-gradient(135deg, #6366f1, #a855f7)"
          : isScheduled
            ? "#1e1e2e"
            : "#111",
        border: isScheduled
          ? `2px solid ${difficultyColors[difficulty || "easy"]}`
          : "1px solid #333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <span
        style={{
          color: isPast ? "#6b7280" : "#fff",
          fontSize: 16,
          fontWeight: isToday ? 700 : 500,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {day}
      </span>
      {isScheduled && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: difficultyColors[difficulty || "easy"],
            position: "absolute",
            bottom: 6,
          }}
        />
      )}
    </div>
  )
}

export const SpacedRepetitionScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Container animations
  const containerOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  // Zoom effect - zoom into calendar then zoom out
  const zoomScale = interpolate(frame, [60, 100, 140, 180], [1, 1.3, 1.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const zoomX = interpolate(frame, [60, 100, 140, 180], [50, 30, 30, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const zoomY = interpolate(frame, [60, 100, 140, 180], [50, 40, 40, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  })

  // Schedule notification animation
  const notificationOpacity = interpolate(frame, [100, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const notificationY = spring({
    frame: Math.max(0, frame - 100),
    fps,
    config: { damping: 12, stiffness: 100 },
    from: 30,
    to: 0,
  })

  // Brain icon pulse
  const brainPulse = interpolate(frame % 60, [0, 30, 60], [1, 1.1, 1])

  // Days of the month with spaced repetition schedule
  const scheduledDays = [
    { day: 8, difficulty: "hard" as const },
    { day: 10, difficulty: "medium" as const },
    { day: 13, difficulty: "easy" as const },
    { day: 15, difficulty: "hard" as const },
    { day: 19, difficulty: "medium" as const },
    { day: 22, difficulty: "easy" as const },
    { day: 26, difficulty: "medium" as const },
  ]

  const today = 15

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
          radial-gradient(circle at 70% 30%, rgba(168, 85, 247, 0.12) 0%, transparent 40%),
          #0a0a0a
        `,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: titleOpacity,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            transform: `scale(${brainPulse})`,
            fontSize: 36,
          }}
        >
          🧠
        </div>
        <span
          style={{
            color: "#fff",
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Spaced Repetition System
        </span>
      </div>

      {/* Main content with zoom */}
      <div
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: `${zoomX}% ${zoomY}%`,
          display: "flex",
          gap: 50,
          alignItems: "flex-start",
          opacity: containerOpacity,
        }}
      >
        {/* Calendar */}
        <div
          style={{
            background: "#111",
            borderRadius: 24,
            padding: 32,
            border: "1px solid #222",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              January 2025
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#1a1a1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                }}
              >
                ←
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#1a1a1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                }}
              >
                →
              </div>
            </div>
          </div>

          {/* Day headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 52px)",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: 12,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 500,
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 52px)",
              gap: 8,
            }}
          >
            {/* Empty cells for alignment (January 2025 starts on Wednesday) */}
            {[...Array(3)].map((_, i) => (
              <div key={`empty-${i}`} style={{ width: 52, height: 52 }} />
            ))}
            {/* Days 1-31 */}
            {[...Array(31)].map((_, i) => {
              const day = i + 1
              const scheduled = scheduledDays.find((s) => s.day === day)
              return (
                <CalendarDay
                  key={day}
                  day={day}
                  isToday={day === today}
                  isScheduled={!!scheduled}
                  isPast={day < today}
                  difficulty={scheduled?.difficulty}
                  delay={20 + i * 1.5}
                />
              )
            })}
          </div>
        </div>

        {/* Right panel - Practice schedule */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Today's practice card */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e1e3f, #1a1a2e)",
              borderRadius: 20,
              padding: 28,
              border: "1px solid #6366f150",
              width: 340,
            }}
          >
            <div
              style={{
                color: "#a5b4fc",
                fontSize: 13,
                fontFamily: "Inter, system-ui, sans-serif",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Today's Review
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 16,
              }}
            >
              Binary Search Trees
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "#ef444420",
                  color: "#ef4444",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: 500,
                }}
              >
                Hard
              </div>
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: 14,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Last practiced: 3 days ago
              </span>
            </div>
          </div>

          {/* Algorithm explanation */}
          <div
            style={{
              background: "#111",
              borderRadius: 20,
              padding: 24,
              border: "1px solid #222",
              width: 340,
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>📈</span>
              How It Works
            </div>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 14,
                fontFamily: "Inter, system-ui, sans-serif",
                lineHeight: 1.6,
              }}
            >
              Problems you struggle with appear more frequently. As you improve, intervals increase
              automatically.
            </div>
          </div>

          {/* Notification popup */}
          <div
            style={{
              opacity: notificationOpacity,
              transform: `translateY(${notificationY}px)`,
              background: "linear-gradient(135deg, #22c55e20, #14b8a620)",
              borderRadius: 16,
              padding: 20,
              border: "1px solid #22c55e40",
              width: 340,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#22c55e20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <div>
              <div
                style={{
                  color: "#22c55e",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Great progress!
              </div>
              <div
                style={{
                  color: "#86efac",
                  fontSize: 13,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Next review in 5 days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          gap: 32,
          opacity: containerOpacity,
        }}
      >
        {[
          { color: "#22c55e", label: "Easy" },
          { color: "#f59e0b", label: "Medium" },
          { color: "#ef4444", label: "Hard" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                background: item.color,
              }}
            />
            <span
              style={{
                color: "#9ca3af",
                fontSize: 14,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
