import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { IntroScene } from "./scenes/IntroScene"
import { ProblemScene } from "./scenes/ProblemScene"
import { AIInterviewerScene } from "./scenes/AIInterviewerScene"
import { SpacedRepetitionScene } from "./scenes/SpacedRepetitionScene"
import { RoadmapScene } from "./scenes/RoadmapScene"
import { AnalyticsScene } from "./scenes/AnalyticsScene"
import { CTAScene } from "./scenes/CTAScene"

export const ProductDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Intro - 0 to 150 frames (5 seconds) */}
      <Sequence from={0} durationInFrames={150}>
        <IntroScene />
      </Sequence>

      {/* Problem Statement - 150 to 270 frames (4 seconds) */}
      <Sequence from={150} durationInFrames={120}>
        <ProblemScene />
      </Sequence>

      {/* AI Interviewer Demo with zoom effects - 270 to 540 frames (9 seconds) */}
      <Sequence from={270} durationInFrames={270}>
        <AIInterviewerScene />
      </Sequence>

      {/* Spaced Repetition Feature - 540 to 780 frames (8 seconds) */}
      <Sequence from={540} durationInFrames={240}>
        <SpacedRepetitionScene />
      </Sequence>

      {/* Personalized Roadmap - 780 to 1020 frames (8 seconds) */}
      <Sequence from={780} durationInFrames={240}>
        <RoadmapScene />
      </Sequence>

      {/* Analytics Dashboard - 1020 to 1170 frames (5 seconds) */}
      <Sequence from={1020} durationInFrames={150}>
        <AnalyticsScene />
      </Sequence>

      {/* CTA - 1170 to 1350 frames (6 seconds) */}
      <Sequence from={1170} durationInFrames={180}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  )
}
