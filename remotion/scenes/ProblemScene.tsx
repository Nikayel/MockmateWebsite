import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

/**
 * ProblemScene - Redesigned with HCI/Marketing principles:
 *
 * 1. EMOTIONAL HOOK: Start with relatable frustration (anxiety visualization)
 * 2. COGNITIVE LOAD: One problem at a time, not all at once
 * 3. CONTRAST PRINCIPLE: Show pain → relief transition
 * 4. TYPOGRAPHY: Clear hierarchy, readable sizes (min 24px for video)
 * 5. COLOR PSYCHOLOGY: Red for pain points, subtle not overwhelming
 * 6. ANIMATION: Purposeful motion that guides attention
 * 7. WHITESPACE: Breathing room for comprehension
 */

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Phase 1: Anxiety visualization (frames 0-40)
  const anxietyOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  })

  const anxietyScale = interpolate(frame, [0, 15, 30, 45], [0.9, 1, 1.02, 1], {
    extrapolateRight: "clamp",
  })

  // Countdown timer that creates urgency
  const countdownDays = Math.max(
    0,
    Math.floor(
      interpolate(frame, [10, 50], [14, 3], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    )
  )

  // Phase 2: Pain points appear sequentially (frames 40-100)
  const pain1 = {
    opacity: interpolate(frame, [45, 55], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    x: spring({
      frame: Math.max(0, frame - 45),
      fps,
      config: { damping: 15, stiffness: 100 },
      from: -30,
      to: 0,
    }),
  }

  const pain2 = {
    opacity: interpolate(frame, [60, 70], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    x: spring({
      frame: Math.max(0, frame - 60),
      fps,
      config: { damping: 15, stiffness: 100 },
      from: -30,
      to: 0,
    }),
  }

  const pain3 = {
    opacity: interpolate(frame, [75, 85], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    x: spring({
      frame: Math.max(0, frame - 75),
      fps,
      config: { damping: 15, stiffness: 100 },
      from: -30,
      to: 0,
    }),
  }

  // Phase 3: "There's a better way" transition (frames 100-120)
  const transitionOpacity = interpolate(frame, [100, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const transitionScale = spring({
    frame: Math.max(0, frame - 100),
    fps,
    config: { damping: 12, stiffness: 80 },
    from: 0.8,
    to: 1,
  })

  // Pulse animation for countdown
  const countdownPulse = interpolate(frame % 20, [0, 10, 20], [1, 1.05, 1])

  // Background gradient shift from anxious to hopeful
  const bgShift = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(
            ellipse at 50% 30%,
            rgba(${interpolate(bgShift, [0, 1], [239, 99])}, ${interpolate(bgShift, [0, 1], [68, 102])}, ${interpolate(bgShift, [0, 1], [68, 241])}, 0.08) 0%,
            transparent 60%
          ),
          #0a0a0a
        `,
        overflow: "hidden",
      }}
    >
      {/* Phase 1: The Anxiety - Interview countdown */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: `translateX(-50%) scale(${anxietyScale})`,
          opacity: anxietyOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Countdown box */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a1a, #111)",
            border: "1px solid #333",
            borderRadius: 20,
            padding: "32px 64px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `scale(${countdownPulse})`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              color: "#6b7280",
              fontSize: 16,
              fontWeight: 500,
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Your Interview
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 800,
                fontFamily: "Inter, system-ui, sans-serif",
                background:
                  countdownDays <= 7
                    ? "linear-gradient(135deg, #ef4444, #f97316)"
                    : "linear-gradient(135deg, #fff, #d1d5db)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {countdownDays}
            </span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "#9ca3af",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              days away
            </span>
          </div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              G
            </div>
            <span
              style={{
                color: "#e5e7eb",
                fontSize: 18,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Google L5
            </span>
          </div>
        </div>
      </div>

      {/* Phase 2: Pain Points - Left aligned for F-pattern reading */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 120,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Pain 1: Isolation */}
        <div
          style={{
            opacity: pain1.opacity,
            transform: `translateX(${pain1.x}px)`,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            😰
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 4,
              }}
            >
              Practicing in isolation
            </div>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 18,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              LeetCode grinding without real feedback
            </div>
          </div>
        </div>

        {/* Pain 2: Cost */}
        <div
          style={{
            opacity: pain2.opacity,
            transform: `translateX(${pain2.x}px)`,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            💸
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 4,
              }}
            >
              Mock interviews are expensive
            </div>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 18,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              $150-300 per session with limited availability
            </div>
          </div>
        </div>

        {/* Pain 3: No structure */}
        <div
          style={{
            opacity: pain3.opacity,
            transform: `translateX(${pain3.x}px)`,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🎯
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                marginBottom: 4,
              }}
            >
              No clear study roadmap
            </div>
            <div
              style={{
                color: "#9ca3af",
                fontSize: 18,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Overwhelmed by what to focus on
            </div>
          </div>
        </div>
      </div>

      {/* Phase 3: Transition - "What if..." */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: "50%",
          transform: `translateX(-50%) scale(${transitionScale})`,
          opacity: transitionOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            background: "linear-gradient(135deg, #a5b4fc, #c4b5fd)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          What if you had a personal AI interviewer?
        </div>
      </div>
    </AbsoluteFill>
  )
}
