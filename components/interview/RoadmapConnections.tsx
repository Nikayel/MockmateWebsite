/**
 * RoadmapConnections Component
 *
 * Renders SVG connection lines between DSA pattern nodes
 * Shows progress through active/inactive states
 */

import { NODE_POSITIONS } from "./RoadmapNode"

interface RoadmapConnectionsProps {
  connections: Array<{ from: string; to: string; isActive: boolean }>
}

export function RoadmapConnections({ connections }: RoadmapConnectionsProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00d9ff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="inactiveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#374151" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#374151" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {connections.map(({ from, to, isActive }) => {
        const fromPos = NODE_POSITIONS[from]
        const toPos = NODE_POSITIONS[to]
        if (!fromPos || !toPos) return null

        // Calculate curved path
        const midY = (fromPos.y + toPos.y) / 2
        const controlY = midY

        return (
          <path
            key={`${from}-${to}`}
            d={`M ${fromPos.x} ${fromPos.y + 3}
                Q ${fromPos.x} ${controlY}, ${(fromPos.x + toPos.x) / 2} ${controlY}
                Q ${toPos.x} ${controlY}, ${toPos.x} ${toPos.y - 1}`}
            fill="none"
            stroke={isActive ? "url(#activeGradient)" : "url(#inactiveGradient)"}
            strokeWidth={isActive ? "0.4" : "0.2"}
            filter={isActive ? "url(#glow)" : undefined}
            className="transition-all duration-500"
          />
        )
      })}
    </svg>
  )
}
