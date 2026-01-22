import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion"

export const AIInterviewerScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Main container animation
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

  // Cinematic zoom effect - zoom into code editor then pan to chat
  const zoomScale = interpolate(frame, [80, 120, 160, 200], [1, 1.4, 1.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const zoomX = interpolate(frame, [80, 120, 160, 200], [50, 75, 25, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const zoomY = interpolate(frame, [80, 120, 160, 200], [50, 55, 45, 50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Chat messages animation
  const message1Opacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const message2Opacity = interpolate(frame, [60, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const message3Opacity = interpolate(frame, [90, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const message4Opacity = interpolate(frame, [120, 135], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Feedback panel animation
  const feedbackOpacity = interpolate(frame, [150, 165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const feedbackY = spring({
    frame: Math.max(0, frame - 150),
    fps,
    config: { damping: 12, stiffness: 100 },
    from: 20,
    to: 0,
  })

  // Typing indicator animation
  const typingOpacity = interpolate(frame, [140, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const dot1Scale = interpolate(frame % 30, [0, 15, 30], [0.5, 1, 0.5])
  const dot2Scale = interpolate((frame + 10) % 30, [0, 15, 30], [0.5, 1, 0.5])
  const dot3Scale = interpolate((frame + 20) % 30, [0, 15, 30], [0.5, 1, 0.5])

  // Code highlight animation (shows which line is being discussed)
  const highlightLine = Math.floor(
    interpolate(frame, [80, 180], [2, 6], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  )

  // Code typing animation
  const codeProgress = interpolate(frame, [40, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const codeLines = [
    { keyword: "def", fn: " two_sum", args: "(nums, target):" },
    { indent: "    ", text: "seen = ", value: "{}" },
    { keyword: "    for", text: " i, num ", keyword2: "in", fn: " enumerate", args: "(nums):" },
    { indent: "        ", text: "complement = target - num" },
    { keyword: "        if", text: " complement ", keyword2: "in", text2: " seen:" },
    { keyword: "            return", text: " [seen[complement], i]" },
    { indent: "        ", text: "seen[num] = i" },
  ]

  const visibleLines = Math.floor(codeProgress * codeLines.length)

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
          #0a0a0a
        `,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          fontSize: 32,
          fontWeight: 600,
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: containerOpacity,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 28 }}>🎯</span>
        Real-Time AI Interview Simulation
      </div>

      {/* Zoomable container */}
      <div
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: `${zoomX}% ${zoomY}%`,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* Mock Interview UI */}
        <div
          style={{
            opacity: containerOpacity,
            transform: `scale(${containerScale})`,
            width: "100%",
            maxWidth: 1400,
            height: 700,
            background: "#111111",
            borderRadius: 24,
            border: "1px solid #222",
            display: "flex",
            overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Left panel - Chat */}
          <div
            style={{
              width: "40%",
              borderRight: "1px solid #222",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #222",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>AI</span>
              </div>
              <div>
                <div
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  AI Interviewer
                </div>
                <div
                  style={{
                    color: "#22c55e",
                    fontSize: 12,
                    fontFamily: "Inter, system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22c55e",
                    }}
                  />
                  Speaking...
                </div>
              </div>
              {/* Voice waveform */}
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: 10 + Math.sin((frame / 4 + i) * 0.8) * 10,
                      background: "linear-gradient(180deg, #6366f1, #a855f7)",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                overflow: "hidden",
              }}
            >
              {/* AI Message */}
              <div style={{ opacity: message1Opacity }}>
                <div
                  style={{
                    background: "#1a1a2e",
                    borderRadius: "16px 16px 16px 4px",
                    padding: "14px 18px",
                    maxWidth: "90%",
                    color: "#e5e7eb",
                    fontSize: 14,
                    fontFamily: "Inter, system-ui, sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  Given an array of integers, find two numbers that add up to a target. What's your
                  approach?
                </div>
              </div>

              {/* User Message with voice indicator */}
              <div
                style={{
                  opacity: message2Opacity,
                  alignSelf: "flex-end",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    borderRadius: "16px 16px 4px 16px",
                    padding: "14px 18px",
                    maxWidth: "90%",
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "Inter, system-ui, sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  I'd use a hash map to store complements as I iterate...
                </div>
              </div>

              {/* AI Follow-up */}
              <div style={{ opacity: message3Opacity }}>
                <div
                  style={{
                    background: "#1a1a2e",
                    borderRadius: "16px 16px 16px 4px",
                    padding: "14px 18px",
                    maxWidth: "90%",
                    color: "#e5e7eb",
                    fontSize: 14,
                    fontFamily: "Inter, system-ui, sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  Good thinking! Can you code that up? What's the time complexity?
                </div>
              </div>

              {/* User response */}
              <div
                style={{
                  opacity: message4Opacity,
                  alignSelf: "flex-end",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    borderRadius: "16px 16px 4px 16px",
                    padding: "14px 18px",
                    maxWidth: "90%",
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "Inter, system-ui, sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  O(n) time and O(n) space for the hash map storage.
                </div>
              </div>

              {/* Typing indicator */}
              <div style={{ opacity: typingOpacity }}>
                <div
                  style={{
                    background: "#1a1a2e",
                    borderRadius: "16px 16px 16px 4px",
                    padding: "14px 18px",
                    display: "flex",
                    gap: 6,
                    width: "fit-content",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#6366f1",
                      transform: `scale(${dot1Scale})`,
                    }}
                  />
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#6366f1",
                      transform: `scale(${dot2Scale})`,
                    }}
                  />
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#6366f1",
                      transform: `scale(${dot3Scale})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - Code Editor */}
          <div
            style={{
              flex: 1,
              background: "#0d1117",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Editor header */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #222",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#eab308" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
              <span
                style={{
                  marginLeft: 12,
                  color: "#6b7280",
                  fontSize: 13,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                solution.py
              </span>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    color: "#22c55e",
                    fontSize: 12,
                    fontFamily: "Inter, system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}
                  />
                  Auto-saved
                </span>
              </div>
            </div>

            {/* Code content with line highlighting */}
            <div
              style={{
                padding: 20,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                fontSize: 14,
                lineHeight: 2,
                flex: 1,
              }}
            >
              {codeLines.slice(0, visibleLines + 1).map((line, i) => {
                const isHighlighted = i === highlightLine && frame > 80
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: isHighlighted ? "#6366f115" : "transparent",
                      marginLeft: -20,
                      marginRight: -20,
                      paddingLeft: 20,
                      paddingRight: 20,
                      borderLeft: isHighlighted ? "3px solid #6366f1" : "3px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ color: "#4b5563", width: 30, fontSize: 12 }}>{i + 1}</span>
                    {line.keyword && <span style={{ color: "#c678dd" }}>{line.keyword}</span>}
                    {line.fn && <span style={{ color: "#61afef" }}>{line.fn}</span>}
                    {line.args && <span style={{ color: "#abb2bf" }}>{line.args}</span>}
                    {line.indent && <span>{line.indent}</span>}
                    {line.text && <span style={{ color: "#abb2bf" }}>{line.text}</span>}
                    {line.value && <span style={{ color: "#e5c07b" }}>{line.value}</span>}
                    {line.keyword2 && <span style={{ color: "#c678dd" }}>{line.keyword2}</span>}
                    {line.text2 && <span style={{ color: "#abb2bf" }}>{line.text2}</span>}
                  </div>
                )
              })}
              {/* Blinking cursor */}
              <div
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 18,
                  background: "#6366f1",
                  opacity: frame % 30 < 15 ? 1 : 0,
                  marginLeft: 30,
                  marginTop: 4,
                }}
              />
            </div>

            {/* Real-time feedback panel */}
            <div
              style={{
                opacity: feedbackOpacity,
                transform: `translateY(${feedbackY}px)`,
                borderTop: "1px solid #222",
                padding: 16,
                background: "#0a0a0a",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 16 }}>💡</span>
                <span
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                >
                  Real-Time Feedback
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: "#22c55e15",
                    borderRadius: 10,
                    padding: 12,
                    border: "1px solid #22c55e30",
                  }}
                >
                  <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    ✓ Strength
                  </div>
                  <div style={{ color: "#86efac", fontSize: 12, lineHeight: 1.4 }}>
                    Optimal O(n) solution using hash map
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "#f59e0b15",
                    borderRadius: 10,
                    padding: 12,
                    border: "1px solid #f59e0b30",
                  }}
                >
                  <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    💭 Suggestion
                  </div>
                  <div style={{ color: "#fcd34d", fontSize: 12, lineHeight: 1.4 }}>
                    Consider edge cases: empty array, no solution
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
