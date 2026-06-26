"use client"

import { PATTERN_ROADMAP } from "@/lib/types/dsa-patterns"
import type { Scenario } from "@/lib/scenarios"
import { useDSARoadmap } from "@/lib/hooks/useDSARoadmap"
import { RoadmapHeader } from "./RoadmapHeader"
import { RoadmapConnections } from "./RoadmapConnections"
import { RoadmapNode } from "./RoadmapNode"
import { RoadmapModal } from "./RoadmapModal"

interface DSARoadmapProps {
  onStartInterview: (scenario: Scenario) => void
  completedProblems?: string[]
}

export function DSARoadmap({ onStartInterview, completedProblems = [] }: DSARoadmapProps) {
  const {
    expandedNode,
    setExpandedNode,
    hoveredNode,
    setHoveredNode,
    containerRef,
    nodeStats,
    unlockedPatterns,
    connections,
    totalProblems,
    totalCompleted,
    getPatternPrerequisites,
  } = useDSARoadmap({ completedProblems })

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Compact Header with inline legend */}
      <RoadmapHeader totalCompleted={totalCompleted} totalProblems={totalProblems} />

      {/* Visual Tree Map - reduced height for less scroll */}
      <div className="relative bg-card/30 rounded-xl border border-border p-3 overflow-x-auto">
        <div className="relative" style={{ minHeight: '520px', minWidth: '800px' }}>
          {/* SVG for connection lines */}
          <RoadmapConnections connections={connections} />

          {/* Pattern Nodes - Simplified cards */}
          {PATTERN_ROADMAP.map((node) => {
            const stats = nodeStats[node.id]
            const isUnlocked = unlockedPatterns[node.id]
            const isHovered = hoveredNode === node.id
            const isExpanded = expandedNode === node.id
            const prerequisites = getPatternPrerequisites(node.id)

            return (
              <RoadmapNode
                key={node.id}
                node={node}
                stats={stats}
                isUnlocked={isUnlocked}
                isHovered={isHovered}
                isExpanded={isExpanded}
                prerequisites={prerequisites}
                nodeStats={nodeStats}
                onNodeClick={() => isUnlocked && setExpandedNode(isExpanded ? null : node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              />
            )
          })}
        </div>
      </div>

      {/* Expanded Problem List Modal - Contains tier/difficulty info moved from cards */}
      <RoadmapModal
        expandedNode={expandedNode}
        nodeStats={nodeStats}
        completedProblems={completedProblems}
        onClose={() => setExpandedNode(null)}
        onStartInterview={onStartInterview}
        getPatternPrerequisites={getPatternPrerequisites}
      />
    </div>
  )
}
