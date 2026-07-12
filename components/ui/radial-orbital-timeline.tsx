"use client"
import { useState, useEffect, useRef } from "react"
import { ArrowRight, Link, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimelineItem {
  id: number
  title: string
  date: string
  content: string
  category: string
  icon: React.ComponentType<{ size?: number }>
  relatedIds: number[]
  status: "completed" | "in-progress" | "pending"
  energy: number
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[]
}

interface NodePosition {
  x: number
  y: number
  angle: number
  zIndex: number
  opacity: number
}

const ORBIT_RADIUS = 160
// 0.3 degrees every 50ms in the old interval loop equals 6 degrees per second.
const DEGREES_PER_SECOND = 6

function getNodePosition(
  index: number,
  total: number,
  rotationAngle: number,
  centerOffset: { x: number; y: number }
): NodePosition {
  const angle = ((index / total) * 360 + rotationAngle) % 360
  const radian = (angle * Math.PI) / 180

  const x = Math.round((ORBIT_RADIUS * Math.cos(radian) + centerOffset.x) * 100) / 100
  const y = Math.round((ORBIT_RADIUS * Math.sin(radian) + centerOffset.y) * 100) / 100

  const zIndex = Math.round(100 + 50 * Math.cos(radian))
  const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)))

  return { x, y, angle, zIndex, opacity }
}

export default function RadialOrbitalTimeline({ timelineData }: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({})
  const [rotationAngle, setRotationAngle] = useState<number>(0)
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({})
  const [centerOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null)
  const [isInView, setIsInView] = useState<boolean>(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const orbitRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>(
    {} as Record<number, HTMLDivElement | null>
  )
  const rotationRef = useRef<number>(0)

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({})
      setActiveNodeId(null)
      setPulseEffect({})
      setAutoRotate(true)
    }
  }

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev }
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false
        }
      })

      newState[id] = !prev[id]

      if (!prev[id]) {
        setActiveNodeId(id)
        setAutoRotate(false)

        const relatedItems = getRelatedItems(id)
        const newPulseEffect: Record<number, boolean> = {}
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true
        })
        setPulseEffect(newPulseEffect)

        centerViewOnNode(id)
      } else {
        setActiveNodeId(null)
        setAutoRotate(true)
        setPulseEffect({})
      }

      return newState
    })
  }

  // Pause the orbit whenever the section scrolls off screen.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])

  // Respect the user's reduced-motion preference and react to live changes.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(query.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    query.addEventListener("change", handleChange)
    return () => {
      query.removeEventListener("change", handleChange)
    }
  }, [])

  // Drive the idle orbit with requestAnimationFrame writing transforms straight to
  // the node refs. React state is reserved for click-to-focus (centerViewOnNode) so
  // the animation never triggers a re-render. The loop only runs while the section is
  // on screen, auto-rotation is enabled, and reduced motion is not requested.
  useEffect(() => {
    if (!autoRotate || !isInView || prefersReducedMotion) return

    let frameId = 0
    let lastTimestamp: number | null = null
    const total = timelineData.length

    const step = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp
      }
      const deltaSeconds = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      rotationRef.current = (rotationRef.current + DEGREES_PER_SECOND * deltaSeconds) % 360

      timelineData.forEach((item, index) => {
        const node = nodeRefs.current[item.id]
        if (!node) return
        const position = getNodePosition(index, total, rotationRef.current, centerOffset)
        node.style.transform = `translate(${position.x}px, ${position.y}px)`
        node.style.zIndex = String(position.zIndex)
        node.style.opacity = String(position.opacity)
      })

      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [autoRotate, isInView, prefersReducedMotion, timelineData, centerOffset])

  const centerViewOnNode = (nodeId: number) => {
    if (!nodeRefs.current[nodeId]) return

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId)
    const totalNodes = timelineData.length
    const targetAngle = (nodeIndex / totalNodes) * 360
    const focusedAngle = 270 - targetAngle

    // Keep the rAF seed in sync so resuming after focus continues from here.
    rotationRef.current = focusedAngle
    setRotationAngle(focusedAngle)
  }

  const calculateNodePosition = (index: number, total: number): NodePosition =>
    getNodePosition(index, total, rotationAngle, centerOffset)

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId)
    return currentItem ? currentItem.relatedIds : []
  }

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false
    const relatedItems = getRelatedItems(activeNodeId)
    return relatedItems.includes(itemId)
  }

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-black border-white"
      case "in-progress":
        return "text-black bg-white border-black"
      case "pending":
        return "text-white bg-black/40 border-white/50"
      default:
        return "text-white bg-black/40 border-white/50"
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="flex h-[480px] w-full flex-col items-center justify-center overflow-hidden bg-transparent sm:h-[520px] lg:h-[560px]"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative flex h-full w-full max-w-4xl items-center justify-center">
        <div
          className="absolute flex h-full w-full items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Center orb */}
          <div className="absolute z-10 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-teal-500">
            <div className="absolute h-20 w-20 animate-ping rounded-full border border-white/20 opacity-70"></div>
            <div
              className="absolute h-24 w-24 animate-ping rounded-full border border-white/10 opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-md"></div>
          </div>

          {/* Orbit ring */}
          <div className="absolute h-80 w-80 rounded-full border border-white/10"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length)
            const isExpanded = expandedItems[item.id]
            const isRelated = isRelatedToActive(item.id)
            const isPulsing = pulseEffect[item.id]
            const Icon = item.icon as React.ComponentType<{ size?: number }>

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            }

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                ref={(el) => {
                  nodeRefs.current[item.id] = el
                }}
                className="absolute cursor-pointer transition-all duration-700"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleItem(item.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleItem(item.id)
                  }
                }}
              >
                {/* Energy aura */}
                <div
                  className={`absolute -inset-1 rounded-full ${isPulsing ? "animate-pulse" : ""}`}
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                {/* Node button */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isExpanded
                      ? "bg-white text-black"
                      : isRelated
                        ? "bg-white/50 text-black"
                        : "bg-black text-white"
                  } border-2 ${
                    isExpanded
                      ? "border-white shadow-lg shadow-white/30"
                      : isRelated
                        ? "animate-pulse border-white"
                        : "border-white/40"
                  } transform transition-all duration-300 ${isExpanded ? "scale-150" : ""} `}
                >
                  <Icon size={16} />
                </div>

                {/* Label */}
                <div
                  className={`absolute top-12 text-xs font-semibold tracking-wider whitespace-nowrap transition-all duration-300 ${isExpanded ? "scale-125 text-white" : "text-white/70"} `}
                  style={{ left: "50%", transform: "translateX(-50%)" }}
                >
                  {item.title}
                </div>

                {/* Expanded card */}
                {isExpanded && (
                  <Card className="absolute top-20 left-1/2 w-64 -translate-x-1/2 overflow-visible border-white/30 bg-black/90 shadow-xl shadow-white/10 backdrop-blur-lg">
                    <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-white/50"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={`px-2 text-xs ${getStatusStyles(item.status)}`}>
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                              ? "IN PROGRESS"
                              : "PENDING"}
                        </Badge>
                        <span className="font-mono text-xs text-white/50">{item.date}</span>
                      </div>
                      <CardTitle className="mt-2 text-sm text-white">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/80">
                      <p>{item.content}</p>

                      <div className="mt-4 border-t border-white/10 pt-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center">
                            <Zap size={10} className="mr-1" />
                            Difficulty
                          </span>
                          <span className="font-mono">{item.energy}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${item.energy}%` }}
                          ></div>
                        </div>
                      </div>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 border-t border-white/10 pt-3">
                          <div className="mb-2 flex items-center">
                            <Link size={10} className="mr-1 text-white/70" />
                            <h4 className="text-xs font-medium tracking-wider text-white/70 uppercase">
                              Related Skills
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId)
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex h-6 items-center rounded-none border-white/20 bg-transparent px-2 py-0 text-xs text-white/80 transition-all hover:bg-white/10 hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleItem(relatedId)
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight size={8} className="ml-1 text-white/60" />
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
