"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import type { OnboardingModule } from "@/lib/labs/onboarding/config"

/**
 * The system map — the one 3D moment in the onboarding cinematic.
 *
 * The ~6 top-level modules laid out in space, lit one at a time. "One module
 * lit at a time" is the whole cognitive-load trick: spatial memory is cheap
 * memory, so a room-by-room layout makes the architecture stick where a file
 * tree would not. HTML labels are projected onto each tile every frame so the
 * "this is this" text stays crisp (WebGL fonts are not worth the cost), and a
 * caption beneath names the lit module in full.
 *
 * Vanilla three.js, no react-three-fiber — matching `components/three/ThreeOrb.tsx`,
 * the app's established 3D pattern (owns its WebGL context and render loop,
 * disposed on unmount). `prefers-reduced-motion` or no WebGL collapses the whole
 * thing to an identical-content 2D grid, so nobody misses information.
 */

const COLORS = {
  panel: "#141922",
  panelLit: "#1b2836",
  steel: "#5C7C99",
  amber: "#E8A13C",
} as const

const COLS = 3
const CYCLE_MS = 2200

/** Grid position of tile `i`, centered on the origin, with a little depth alternation. */
function tilePosition(i: number, count: number): [number, number, number] {
  const rows = Math.ceil(count / COLS)
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const x = (col - (COLS - 1) / 2) * 2.5
  const y = -(row - (rows - 1) / 2) * 1.7
  const z = (col + row) % 2 === 0 ? 0.25 : -0.25
  return [x, y, z]
}

/** Identical-content 2D fallback for reduced-motion / no-WebGL. No canvas, no animation loop. */
function SystemMapFallback({ modules }: { modules: OnboardingModule[] }) {
  return (
    <div className="lab-onb-map-fallback" role="img" aria-label="The system, module by module">
      <ul>
        {modules.map((module) => (
          <li key={module.id}>
            <span className="lab-onb-map-fallback-label">{module.label}</span>
            <span className="lab-onb-map-fallback-role">{module.role}</span>
            <code>{module.path}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SystemMap({ modules }: { modules: OnboardingModule[] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  // The lit tile. A ref drives the render loop (no re-render per frame); state drives the caption.
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  // "pending" until we know whether WebGL is usable; then "webgl" or "fallback".
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">("pending")

  // Decide the mode once, on the client only.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let webglOk = false
    try {
      const probe = document.createElement("canvas")
      webglOk = Boolean(probe.getContext("webgl2") || probe.getContext("webgl"))
    } catch {
      webglOk = false
    }
    setMode(reduce || !webglOk ? "fallback" : "webgl")
  }, [])

  // Cycle the lit module (both modes benefit; the caption tracks it).
  useEffect(() => {
    if (mode !== "webgl") return
    const id = window.setInterval(() => {
      const next = (activeRef.current + 1) % modules.length
      activeRef.current = next
      setActive(next)
    }, CYCLE_MS)
    return () => window.clearInterval(id)
  }, [mode, modules.length])

  // The WebGL scene.
  useEffect(() => {
    if (mode !== "webgl") return
    const host = hostRef.current
    if (!host) return

    const W = () => host.clientWidth
    const H = () => host.clientHeight || 1

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 100)
    cam.position.set(0, 0.25, 7.4)
    cam.lookAt(0, 0, 0)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      // Context creation can still fail after the probe passed (driver, memory). Fail to 2D.
      setMode("fallback")
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(W(), H())
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    })
    host.appendChild(renderer.domElement)

    const boxGeo = new THREE.BoxGeometry(2, 1.15, 0.18)
    const edgeGeo = new THREE.EdgesGeometry(boxGeo)
    const glowGeo = new THREE.PlaneGeometry(2.3, 1.42)

    interface Tile {
      group: THREE.Group
      base: THREE.Vector3
      edgeMat: THREE.LineBasicMaterial
      glowMat: THREE.MeshBasicMaterial
      panelMat: THREE.MeshBasicMaterial
      phase: number
    }

    const tiles: Tile[] = modules.map((_, i) => {
      const [x, y, z] = tilePosition(i, modules.length)
      const group = new THREE.Group()
      group.position.set(x, y, z)

      const panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.panel) })
      const panel = new THREE.Mesh(boxGeo, panelMat)

      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(COLORS.steel),
        transparent: true,
        opacity: 0.4,
      })
      const edges = new THREE.LineSegments(edgeGeo, edgeMat)

      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLORS.amber),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.z = -0.12

      group.add(glow, panel, edges)
      scene.add(group)
      return { group, base: new THREE.Vector3(x, y, z), edgeMat, glowMat, panelMat, phase: i * 1.3 }
    })

    const litEdge = new THREE.Color(COLORS.amber)
    const dimEdge = new THREE.Color(COLORS.steel)
    const litPanel = new THREE.Color(COLORS.panelLit)
    const dimPanel = new THREE.Color(COLORS.panel)
    const projected = new THREE.Vector3()

    const positionLabels = () => {
      const w = W()
      const h = H()
      tiles.forEach((tile, i) => {
        const label = labelRefs.current[i]
        if (!label) return
        projected.copy(tile.group.position).project(cam)
        const sx = (projected.x * 0.5 + 0.5) * w
        const sy = (-projected.y * 0.5 + 0.5) * h
        label.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`
        label.style.opacity = i === activeRef.current ? "1" : "0.45"
      })
    }

    const onResize = () => {
      renderer.setSize(W(), H())
      cam.aspect = W() / H()
      cam.updateProjectionMatrix()
      positionLabels()
    }
    window.addEventListener("resize", onResize, { passive: true })

    let raf = 0
    const clock = new THREE.Clock()
    const render = () => {
      const el = clock.getElapsedTime()
      const activeX = tiles[activeRef.current]?.base.x ?? 0
      // Gentle sway toward the lit tile so the map "moves to each in turn."
      cam.position.x += (activeX * 0.14 - cam.position.x) * 0.04
      cam.lookAt(0, 0, 0)

      tiles.forEach((tile, i) => {
        const isActive = i === activeRef.current
        tile.group.position.y = tile.base.y + Math.sin(el * 0.8 + tile.phase) * 0.04
        const targetScale = isActive ? 1.09 : 1
        const s = tile.group.scale.x + (targetScale - tile.group.scale.x) * 0.08
        tile.group.scale.setScalar(s)
        tile.glowMat.opacity += ((isActive ? 0.5 : 0) - tile.glowMat.opacity) * 0.08
        tile.edgeMat.opacity += ((isActive ? 0.95 : 0.4) - tile.edgeMat.opacity) * 0.08
        tile.edgeMat.color.lerp(isActive ? litEdge : dimEdge, 0.08)
        tile.panelMat.color.lerp(isActive ? litPanel : dimPanel, 0.08)
      })

      positionLabels()
      renderer.render(scene, cam)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
      renderer.domElement.remove()
      boxGeo.dispose()
      edgeGeo.dispose()
      glowGeo.dispose()
      tiles.forEach((tile) => {
        tile.edgeMat.dispose()
        tile.glowMat.dispose()
        tile.panelMat.dispose()
      })
    }
  }, [mode, modules])

  if (mode === "fallback") {
    return <SystemMapFallback modules={modules} />
  }

  const activeModule = modules[active]
  return (
    <div className="lab-onb-map">
      <div ref={hostRef} className="lab-onb-map-canvas" aria-hidden>
        {modules.map((module, i) => (
          <div
            key={module.id}
            ref={(el) => {
              labelRefs.current[i] = el
            }}
            className="lab-onb-map-tile-label"
          >
            {module.label}
          </div>
        ))}
      </div>
      <p className="lab-onb-map-caption" aria-live="polite">
        <span className="lab-onb-map-caption-label">{activeModule?.label}</span>
        <span className="lab-onb-map-caption-role">{activeModule?.role}</span>
        <code>{activeModule?.path}</code>
      </p>
    </div>
  )
}
