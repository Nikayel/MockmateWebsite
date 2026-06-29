"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type OrbVariant = "hero" | "knot" | "geo"

/**
 * Cursor-sensitive, theme-aware 3D orb (vanilla three.js, no SSR).
 *
 * One reusable component, three variants:
 *  - "hero": icosphere, offset right, idle spin + cursor parallax (ignores scroll)
 *  - "knot": torus knot, centered, scroll-rotates + cursor parallax
 *  - "geo":  geodesic sphere, centered, scroll-rotates + cursor parallax
 *
 * Theme awareness: reads the live `--accent` CSS variable and recolors via a
 * MutationObserver on <html>'s class, so the orb crossfades in step with the
 * page when the `.dark` class flips. Scroll variants read progress from the
 * nearest `[data-orb-section]` ancestor. Honors prefers-reduced-motion (renders
 * a single static frame). The canvas is pointer-events:none so it never blocks
 * clicks, and the renderer is disposed on unmount.
 *
 * Note: the rest of the app uses react-three-fiber (SubtleParticles,
 * NeuralNetwork). This component is intentionally vanilla three to match the
 * design handoff spec verbatim; it owns its own WebGL context and does not
 * interfere with R3F canvases on other routes.
 */
export function ThreeOrb({ variant = "hero" }: { variant?: OrbVariant }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const W = () => host.clientWidth
    const H = () => host.clientHeight

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 100)
    cam.position.z = variant === "geo" ? 6.6 : variant === "hero" ? 5.8 : 6

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.setSize(W(), H())
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    })
    host.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const geo =
      variant === "knot"
        ? new THREE.TorusKnotGeometry(1.3, 0.42, 170, 26)
        : variant === "geo"
          ? new THREE.IcosahedronGeometry(2.1, 2)
          : new THREE.IcosahedronGeometry(1.6, 1)

    // Typed material refs so recolor() never needs `any`.
    const wireMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 })
    const pointsMat = new THREE.PointsMaterial({
      size: 0.03,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true,
    })
    const coreMat = new THREE.MeshBasicMaterial()
    const haloMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const coreR = variant === "hero" ? 0.34 : variant === "knot" ? 0.3 : 0.5
    const haloR = variant === "hero" ? 0.62 : variant === "knot" ? 0.62 : 0.95

    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireMat)
    const points = new THREE.Points(geo, pointsMat)
    const core = new THREE.Mesh(new THREE.SphereGeometry(coreR, 32, 32), coreMat)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(haloR, 32, 32), haloMat)
    group.add(wire, points, core, halo)

    // Ambient particle field.
    const N = 800
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 3 + Math.random() * 2.4
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(p) * Math.cos(t)
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t)
      pos[i * 3 + 2] = r * Math.cos(p)
    }
    const fieldGeo = new THREE.BufferGeometry()
    fieldGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    const fieldMat = new THREE.PointsMaterial({
      size: 0.013,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
    })
    const field = new THREE.Points(fieldGeo, fieldMat)
    scene.add(field)

    // Hero sits to the right and is offset; centered variants run larger.
    if (variant === "hero") {
      group.position.x = 1.5
      field.position.x = 1.2
    }
    if (variant === "geo") group.scale.setScalar(1.04)

    // ---- THEME AWARENESS: read --accent from CSS, recolor on .dark flips ----
    const cssVar = (v: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    const recolor = () => {
      const c = new THREE.Color(cssVar("--accent") || "#d0824f")
      wireMat.color = c
      pointsMat.color = c.clone()
      coreMat.color = c.clone()
      haloMat.color = c.clone()
      const dark = document.documentElement.classList.contains("dark")
      fieldMat.color = new THREE.Color(dark ? "#ece9e1" : "#8a857c")
    }
    recolor()
    const obs = new MutationObserver(recolor)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    // ---- CURSOR SENSITIVITY: normalize pointer, lerp into rotation each frame ----
    let tpx = 0
    let tpy = 0
    let px = 0
    let py = 0
    const onMove = (e: PointerEvent) => {
      tpx = (e.clientX / innerWidth) * 2 - 1
      tpy = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener("pointermove", onMove, { passive: true })

    // Scroll progress (only knot/geo react to scroll).
    const scrollProg = () => {
      const sec = host.closest("[data-orb-section]")
      if (!(sec instanceof HTMLElement)) return 0
      const r = sec.getBoundingClientRect()
      const span = sec.offsetHeight - innerHeight
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
    }

    const onResize = () => {
      renderer.setSize(W(), H())
      cam.aspect = W() / H()
      cam.updateProjectionMatrix()
    }
    addEventListener("resize", onResize, { passive: true })

    let raf = 0
    const clock = new THREE.Clock()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = clock.getDelta()
      const el = clock.getElapsedTime()
      const prog = variant === "hero" ? 0 : scrollProg()
      px += (tpx - px) * 0.05 // smooth follow
      py += (tpy - py) * 0.05
      group.rotation.y = el * 0.12 + prog * Math.PI * 1.3 + px * 0.35
      group.rotation.x = (variant === "knot" ? el * 0.05 : variant === "geo" ? 0.12 : 0) + py * 0.25
      group.rotation.z = variant === "hero" ? px * 0.12 : 0
      if (variant !== "hero") group.scale.setScalar((variant === "geo" ? 1.04 : 1) + prog * 0.22)
      const pulse = 1 + Math.sin(el * 2) * 0.07
      core.scale.setScalar(pulse)
      halo.scale.setScalar(pulse)
      field.rotation.y += dt * 0.01
      renderer.render(scene, cam)
    }

    if (reduce) renderer.render(scene, cam)
    else loop()

    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      removeEventListener("pointermove", onMove)
      removeEventListener("resize", onResize)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [variant])

  return <div ref={ref} className="pointer-events-none absolute inset-0 -z-0" aria-hidden />
}
