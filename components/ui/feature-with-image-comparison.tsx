import React, { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { GripVertical } from "lucide-react"

function Feature() {
  const [inset, setInset] = useState<number>(50)
  const [onMouseDown, setOnMouseDown] = useState<boolean>(false)

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!onMouseDown) return

    const rect = e.currentTarget.getBoundingClientRect()
    let x = 0

    if ("touches" in e && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left
    } else if ("clientX" in e) {
      x = e.clientX - rect.left
    }

    const percentage = (x / rect.width) * 100
    setInset(Math.max(0, Math.min(100, percentage)))
  }

  return (
    <div className="w-full py-12 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4">
          <div>
            <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
              Interface
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tighter text-white md:text-5xl lg:max-w-xl">
              Traditional vs. Interactive
            </h2>
            <p className="max-w-xl text-lg leading-relaxed tracking-tight text-gray-400 lg:max-w-xl">
              Compare LeetCode&apos;s silent code editor (right) with CodeSparring&apos;s
              interactive voice-enabled AI mock interview interface (left).
            </p>
          </div>
          <div className="w-full pt-8">
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className="relative aspect-video h-full w-full overflow-hidden rounded-2xl border border-white/10 select-none"
              onMouseMove={onMouseMove}
              onMouseUp={() => setOnMouseDown(false)}
              onTouchMove={onMouseMove}
              onTouchEnd={() => setOnMouseDown(false)}
            >
              <div
                className="pointer-events-none absolute top-0 z-20 -ml-[1px] h-full w-[2px] bg-white/50 select-none"
                style={{
                  left: inset + "%",
                }}
              >
                <button
                  className="absolute top-1/2 z-30 -ml-4 flex h-8 w-8 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-white shadow-lg transition-all select-none hover:scale-110 active:scale-95"
                  onTouchStart={(e) => {
                    setOnMouseDown(true)
                    onMouseMove(e)
                  }}
                  onMouseDown={(e) => {
                    setOnMouseDown(true)
                    onMouseMove(e)
                  }}
                  onTouchEnd={() => setOnMouseDown(false)}
                  onMouseUp={() => setOnMouseDown(false)}
                >
                  <GripVertical className="h-4 w-4 select-none" />
                </button>
              </div>
              <Image
                src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1920&auto=format&fit=crop"
                alt="LeetCode Editor UI View"
                width={1920}
                height={1080}
                priority
                className="absolute top-0 left-0 z-10 aspect-video h-full w-full rounded-2xl border select-none"
                style={{
                  clipPath: "inset(0 0 0 " + inset + "%)",
                }}
              />
              <Image
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920&auto=format&fit=crop"
                alt="CodeSparring Voice Interview UI View"
                width={1920}
                height={1080}
                priority
                className="absolute top-0 left-0 aspect-video h-full w-full rounded-2xl border select-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Feature }
