"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * MemoryBrain — the "Why DSA" hero visual.
 *
 * A slowly-swaying, cursor-reactive brain that signifies remembrance, built from
 * ~130 "synapse" nodes (not a literal mesh). Each node runs its own decay/review
 * cycle: its brightness fades over a few seconds (forgetting), then on a per-node
 * interval it fires back to full clay with a brief flash (review). So at any
 * moment some nodes are dim and some freshly refreshed — it reads as "recall kept
 * alive." Faint clay lines connect nearby nodes; a few code glyphs drift on slow
 * orbits, tying memory to code.
 *
 * Vanilla three.js in a useEffect (no SSR), matching the {@link ThreeOrb} pattern:
 * it owns its own WebGL context, reads the live `--accent` CSS variable and
 * recolors via a MutationObserver on <html>'s class, honors prefers-reduced-motion
 * (renders one static frame), is pointer-events:none so it never blocks clicks,
 * and disposes everything on unmount. Fully theme-aware: the clay accent, the
 * faded (forgotten) node color, and the ambient mote color all swap on light/dark
 * so the brain stays legible on either surface.
 */
export function MemoryBrain() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const W = () => host.clientWidth
    const H = () => host.clientHeight

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 100)
    cam.position.z = 5.1

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    const dpr = Math.min(devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(W(), H())
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    })
    host.appendChild(renderer.domElement)

    const group = new THREE.Group()
    group.rotation.x = 0.12
    scene.add(group)

    // ---- Synapse node cloud, deformed from a sphere into a brain ----------
    const NODE_COUNT = 130
    const positions = new Float32Array(NODE_COUNT * 3)
    const brights = new Float32Array(NODE_COUNT)
    const lastFire = new Float32Array(NODE_COUNT)
    const interval = new Float32Array(NODE_COUNT)
    const GOLDEN = Math.PI * (1 + Math.sqrt(5))

    for (let i = 0; i < NODE_COUNT; i++) {
      // even-ish point on a sphere (Fibonacci spiral)
      const tt = (i + 0.5) / NODE_COUNT
      const phi = Math.acos(1 - 2 * tt)
      const theta = GOLDEN * i
      let x = Math.sin(phi) * Math.cos(theta)
      let y = Math.cos(phi)
      let z = Math.sin(phi) * Math.sin(theta)
      // gyri / sulci — layered sine "wrinkle" noise on the radius
      const wrinkle =
        0.085 * Math.sin(x * 6 + y * 5) +
        0.06 * Math.sin(z * 7 - y * 4) +
        0.04 * Math.sin(x * 9 + z * 8)
      const r = 1 + wrinkle
      // ellipsoid: wider X, shorter Y, longer front-back Z
      x *= 1.28 * r
      y *= 0.92 * r
      z *= 1.46 * r
      // central fissure — push each hemisphere out from the midline
      x += (x >= 0 ? 1 : -1) * 0.1
      // midline groove — sink the crown gently near the fissure
      y -= 0.12 * Math.exp(-(x * x) / 0.05)
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      // each node forgets then reviews on its own staggered cycle
      interval[i] = 2.4 + Math.random() * 3.6
      lastFire[i] = -Math.random() * interval[i]
      brights[i] = Math.random()
    }

    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const brightAttr = new THREE.BufferAttribute(brights, 1)
    brightAttr.setUsage(THREE.DynamicDrawUsage)
    nodeGeo.setAttribute("aBright", brightAttr)

    const nodeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color("#d0824f") },
        uFaded: { value: new THREE.Color("#5c574e") },
        uSize: { value: 13.0 },
        uDpr: { value: dpr },
      },
      vertexShader: /* glsl */ `
        attribute float aBright;
        varying float vBright;
        uniform float uSize;
        uniform float uDpr;
        void main() {
          vBright = aBright;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * uDpr * (0.5 + aBright * 1.1) * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying float vBright;
        uniform vec3 uColor;
        uniform vec3 uFaded;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uFaded, uColor, vBright);
          float a = soft * (0.22 + 0.78 * vBright);
          gl_FragColor = vec4(col, a);
        }
      `,
    })
    const nodes = new THREE.Points(nodeGeo, nodeMat)
    group.add(nodes)

    // ---- Neural connections — faint lines between nearby nodes ------------
    const linePts: number[] = []
    const TH2 = 0.52 * 0.52
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        if (dx * dx + dy * dy + dz * dz < TH2) {
          linePts.push(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2]
          )
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3))
    const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.12 })
    const lines = new THREE.LineSegments(lineGeo, lineMat)
    group.add(lines)

    // ---- Drifting code glyphs (canvas sprites on slow orbits) -------------
    const GLYPHS = ["{ }", "</>", "=>", "[ ]", "( )", "fn", "&&"]
    const glyphTextures: THREE.Texture[] = []
    const glyphSprites: {
      sprite: THREE.Sprite
      rx: number
      rz: number
      y: number
      sp: number
      ph: number
    }[] = []
    GLYPHS.forEach((g, i) => {
      const cv = document.createElement("canvas")
      cv.width = 128
      cv.height = 64
      const ctx = cv.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#ffffff"
        ctx.font = "600 40px ui-monospace, monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(g, 64, 34)
      }
      const tex = new THREE.CanvasTexture(cv)
      glyphTextures.push(tex)
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(0.46, 0.23, 1)
      group.add(sprite)
      glyphSprites.push({
        sprite,
        rx: 2.0 + Math.random() * 0.7,
        rz: 1.9 + Math.random() * 0.8,
        y: (Math.random() - 0.5) * 1.8,
        sp: 0.1 + Math.random() * 0.12,
        ph: (i / GLYPHS.length) * Math.PI * 2,
      })
    })

    // ---- Ambient mote field behind the brain ------------------------------
    const MOTES = 600
    const motePos = new Float32Array(MOTES * 3)
    for (let i = 0; i < MOTES; i++) {
      const r = 3 + Math.random() * 2.6
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      motePos[i * 3] = r * Math.sin(p) * Math.cos(t)
      motePos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t)
      motePos[i * 3 + 2] = r * Math.cos(p)
    }
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3))
    const moteMat = new THREE.PointsMaterial({
      size: 0.014,
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true,
    })
    const motes = new THREE.Points(moteGeo, moteMat)
    scene.add(motes)

    // ---- Theme awareness: clay swaps with --accent on .dark flips ---------
    const cssVar = (v: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    const recolor = () => {
      const accent = new THREE.Color(cssVar("--accent") || "#d0824f")
      ;(nodeMat.uniforms.uColor.value as THREE.Color).copy(accent)
      lineMat.color.copy(accent)
      glyphSprites.forEach((g) => (g.sprite.material as THREE.SpriteMaterial).color.copy(accent))
      // Faded (forgotten) nodes and ambient motes must read on the live surface:
      // a warm grey just off the dark bg, or a soft taupe just under the light bg.
      const dark = document.documentElement.classList.contains("dark")
      ;(nodeMat.uniforms.uFaded.value as THREE.Color).set(dark ? "#5c574e" : "#cabfad")
      moteMat.color.set(dark ? "#d8d2c6" : "#8a857c")
    }
    recolor()
    const obs = new MutationObserver(recolor)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    // ---- Cursor parallax --------------------------------------------------
    let tpx = 0
    let tpy = 0
    let px = 0
    let py = 0
    const onMove = (e: PointerEvent) => {
      tpx = (e.clientX / innerWidth) * 2 - 1
      tpy = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener("pointermove", onMove, { passive: true })

    const onResize = () => {
      renderer.setSize(W(), H())
      cam.aspect = W() / H()
      cam.updateProjectionMatrix()
    }
    addEventListener("resize", onResize, { passive: true })

    const TAU = 1.25 // seconds for a node to fade to ~37% brightness
    const clock = new THREE.Clock()
    let raf = 0

    const frame = () => {
      const el = clock.getElapsedTime()
      // each node forgets (exponential decay), then fires back to full
      for (let i = 0; i < NODE_COUNT; i++) {
        let age = el - lastFire[i]
        if (age > interval[i]) {
          lastFire[i] = el
          interval[i] = 2.4 + Math.random() * 3.6
          age = 0
        }
        brights[i] = Math.exp(-age / TAU)
      }
      brightAttr.needsUpdate = true
      // glyphs drift on slow orbits with a gentle opacity bob
      for (const g of glyphSprites) {
        const a = el * g.sp + g.ph
        g.sprite.position.set(
          Math.cos(a) * g.rx,
          g.y + Math.sin(el * 0.5 + g.ph) * 0.18,
          Math.sin(a) * g.rz
        )
        ;(g.sprite.material as THREE.SpriteMaterial).opacity =
          0.32 + 0.26 * (0.5 + 0.5 * Math.sin(el * 0.8 + g.ph))
      }
      // sway (not full spin, so the two lobes stay readable) + parallax + float
      px += (tpx - px) * 0.05
      py += (tpy - py) * 0.05
      group.rotation.y = Math.sin(el * 0.22) * 0.5 + px * 0.3
      group.rotation.x = 0.12 + py * 0.18
      group.position.y = Math.sin(el * 0.6) * 0.04
      motes.rotation.y = el * 0.012
      renderer.render(scene, cam)
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      frame()
    }

    if (reduce) frame()
    else loop()

    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      removeEventListener("pointermove", onMove)
      removeEventListener("resize", onResize)
      nodeGeo.dispose()
      nodeMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      moteGeo.dispose()
      moteMat.dispose()
      glyphTextures.forEach((t) => t.dispose())
      glyphSprites.forEach((g) => (g.sprite.material as THREE.SpriteMaterial).dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden />
}
