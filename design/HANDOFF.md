# CodeSparring — Implementation brief for the coding agent

Goal: bring the landing into the look from the design mock — a **theme-aware hero** with a cursor-sensitive 3D orb, the same **light/dark color scheme** that crossfades smoothly, and **two more cursor-sensitive orbs** on the Rounds and Compare pages. Add **Rounds** and **Compare** to the navbar. **Do not change anything else** — keep all existing routes, copy, auth, and app surfaces exactly as they are.

There are **3 orbs total**, all built from one reusable component:
1. **Hero** (landing) — icosphere, offset right, idle spin + cursor parallax
2. **Rounds** — torus knot, centered, scroll-rotates + cursor parallax
3. **Compare** — geodesic sphere, centered, scroll-rotates + cursor parallax

---

## 1. Color tokens (light + dark)

Use the project's existing CSS-variable theme system. These are the exact values from the mock — map them onto your current token names (don't invent a parallel system). The accent is the single brand clay; everything else is warm charcoal / warm paper.

```css
/* globals.css */
:root {
  --bg:        #f9f8f5;   /* page */
  --bg-2:      #f1efe9;   /* alt section band */
  --surface:   #ffffff;   /* cards / panels */
  --surface-2: #f4f2ec;
  --foreground:#26241f;   /* primary text */
  --muted:     #6c685f;   /* secondary text */
  --faint:     #a8a39a;   /* tertiary / labels */
  --border:    #e6e2d8;
  --line:      rgba(38,36,31,.08);
  --accent:    #bd6a39;   /* clay — the only brand color */
  --accent-soft: rgba(189,106,57,.10);
  --glow:      rgba(189,106,57,.20);
  --success:   #1d9e75;
}
.dark {
  --bg:        #1a1917;
  --bg-2:      #1f1e1b;
  --surface:   #232220;
  --surface-2: #2a2926;
  --foreground:#ece9e1;
  --muted:     #b3afa4;
  --faint:     #8a8780;
  --border:    #38362f;
  --line:      rgba(236,233,225,.08);
  --accent:    #d0824f;   /* clay reads brighter on dark */
  --accent-soft: rgba(208,130,79,.14);
  --glow:      rgba(208,130,79,.45);
  --success:   #4cc79b;
}
```

Rules for the agent:
- Style **every** new element with these tokens (`background: var(--bg)`, `color: var(--foreground)`, `border-color: var(--border)`, accent = `var(--accent)`), never hard-coded hex. That is what makes both modes "just work."
- Keep toggling the `.dark` class on `<html>` exactly as the app already does (before first paint, to avoid a flash).

---

## 2. The smooth light↔dark crossfade

This is the entire effect: put a transition on the color properties so they animate when `.dark` flips. Add to `globals.css`:

```css
@layer base {
  *, *::before, *::after {
    transition-property: background-color, border-color, color, fill, stroke, box-shadow;
    transition-duration: .45s;
    transition-timing-function: cubic-bezier(.22,.61,.36,1);
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0s; }
  }
}
```

Gotchas:
- If using `next-themes`, leave `disableTransitionOnChange` **OFF** (its default) — turning it on kills this animation.
- The orb recolors itself in step (see §3), so the canvas and the page crossfade together.

---

## 3. The reusable cursor-sensitive 3D orb

One client component, three variants. Vanilla `three` in a `useEffect` (no SSR). `npm i three`.

Cursor sensitivity = track `pointermove`, normalize to −1..1, **lerp** into the group's rotation/position each frame (smooth, not jumpy). Theme awareness = read `--accent` from CSS and recolor via a `MutationObserver` on `<html>`'s class.

```tsx
'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Variant = 'hero' | 'knot' | 'geo'

export function ThreeOrb({ variant = 'hero' }: { variant?: Variant }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const W = () => host.clientWidth, H = () => host.clientHeight

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 100)
    cam.position.z = variant === 'geo' ? 6.6 : variant === 'hero' ? 5.8 : 6
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.setSize(W(), H())
    Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
    host.appendChild(renderer.domElement)

    const group = new THREE.Group(); scene.add(group)
    const geo =
      variant === 'knot' ? new THREE.TorusKnotGeometry(1.3, 0.42, 170, 26)
      : variant === 'geo' ? new THREE.IcosahedronGeometry(2.1, 2)
      : new THREE.IcosahedronGeometry(1.6, 1)

    const wire   = new THREE.LineSegments(new THREE.WireframeGeometry(geo),
                     new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 }))
    const points = new THREE.Points(geo,
                     new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.72, sizeAttenuation: true }))
    const core   = new THREE.Mesh(new THREE.SphereGeometry(variant === 'hero' ? 0.34 : variant === 'knot' ? 0.3 : 0.5, 32, 32),
                     new THREE.MeshBasicMaterial())
    const halo   = new THREE.Mesh(new THREE.SphereGeometry(variant === 'hero' ? 0.62 : variant === 'knot' ? 0.62 : 0.95, 32, 32),
                     new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }))
    group.add(wire, points, core, halo)

    // ambient particle field
    const N = 800, pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 3 + Math.random() * 2.4, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
      pos[i*3]=r*Math.sin(p)*Math.cos(t); pos[i*3+1]=r*Math.sin(p)*Math.sin(t); pos[i*3+2]=r*Math.cos(p)
    }
    const fieldGeo = new THREE.BufferGeometry()
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const field = new THREE.Points(fieldGeo,
      new THREE.PointsMaterial({ size: 0.013, transparent: true, opacity: 0.3, sizeAttenuation: true }))
    scene.add(field)

    // hero sits to the right and is offset; other variants are centered + larger
    if (variant === 'hero') { group.position.x = 1.5; field.position.x = 1.2 }
    if (variant === 'geo') group.scale.setScalar(1.04)

    // ---- THEME AWARENESS: read --accent from CSS, recolor on .dark flips ----
    const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    const recolor = () => {
      const c = new THREE.Color(cssVar('--accent') || '#d0824f')
      ;[wire, points, core, halo].forEach(m => (m.material as any).color = c)
      const dark = document.documentElement.classList.contains('dark')
      ;(field.material as any).color = new THREE.Color(dark ? '#ece9e1' : '#8a857c')
    }
    recolor()
    const obs = new MutationObserver(recolor)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // ---- CURSOR SENSITIVITY: normalize pointer, lerp into rotation each frame ----
    let tpx = 0, tpy = 0, px = 0, py = 0
    const onMove = (e: PointerEvent) => { tpx = (e.clientX / innerWidth) * 2 - 1; tpy = (e.clientY / innerHeight) * 2 - 1 }
    addEventListener('pointermove', onMove, { passive: true })

    // scroll progress (only knot/geo react to scroll)
    const scrollProg = () => {
      const sec = host.closest('[data-orb-section]') as HTMLElement | null
      if (!sec) return 0
      const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0
    }

    const onResize = () => { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix() }
    addEventListener('resize', onResize, { passive: true })

    let raf = 0; const clock = new THREE.Clock()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = clock.getDelta(), el = clock.getElapsedTime(), prog = variant === 'hero' ? 0 : scrollProg()
      px += (tpx - px) * 0.05; py += (tpy - py) * 0.05            // smooth follow
      group.rotation.y = el * 0.12 + prog * Math.PI * 1.3 + px * 0.35
      group.rotation.x = (variant === 'knot' ? el * 0.05 : variant === 'geo' ? 0.12 : 0) + py * 0.25
      group.rotation.z = variant === 'hero' ? px * 0.12 : 0
      if (variant !== 'hero') group.scale.setScalar((variant === 'geo' ? 1.04 : 1) + prog * 0.22)
      const pulse = 1 + Math.sin(el * 2) * 0.07
      core.scale.setScalar(pulse); halo.scale.setScalar(pulse)
      field.rotation.y += dt * 0.01
      renderer.render(scene, cam)
    }
    reduce ? renderer.render(scene, cam) : loop()

    return () => {
      cancelAnimationFrame(raf); obs.disconnect()
      removeEventListener('pointermove', onMove); removeEventListener('resize', onResize)
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [variant])

  return <div ref={ref} className="pointer-events-none absolute inset-0 -z-0" aria-hidden />
}
```

Mounting each orb:

- **Hero (landing):** put `<ThreeOrb variant="hero" />` as the first child of the hero `<section>` (which is `position: relative; overflow: hidden`). Add a left-to-right scrim + a dotted texture over it so text stays readable:
  ```tsx
  <section className="relative flex min-h-screen items-center overflow-hidden" style={{ background: 'var(--bg)' }}>
    <ThreeOrb variant="hero" />
    <div className="pointer-events-none absolute inset-0 opacity-60"
         style={{ backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)', backgroundSize: '23px 23px' }} />
    <div className="pointer-events-none absolute inset-y-0 left-0 right-1/2"
         style={{ background: 'linear-gradient(90deg, var(--bg) 18%, transparent 90%)' }} />
    <div className="relative z-10 …">{/* existing hero copy, unchanged */}</div>
  </section>
  ```
- **Rounds / Compare:** wrap the hero in a tall sticky section so the orb reacts to scroll, and tag it `data-orb-section` (the orb reads this for scroll progress):
  ```tsx
  <section data-orb-section className="relative" style={{ height: '160vh' }}>
    <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
      <ThreeOrb variant="knot" /> {/* "geo" on Compare */}
      <div className="relative z-10 text-center …">{/* page heading */}</div>
    </div>
  </section>
  ```

Performance/guardrails: one WebGL context per page (don't mount two orbs on the same route), pixel-ratio capped at 2, `prefers-reduced-motion` renders a single static frame, and the cleanup disposes the renderer on unmount. Keep the canvas `pointer-events: none` so it never blocks clicks.

---

## 4. Navbar — add Rounds + Compare

Add two links to the **existing** nav, in this order, without touching the rest of the nav, the logo, the auth buttons, or the theme toggle:

```
Rounds   → /rounds
Compare  → /compare
```

Use the current nav's own link styling (same component, same `text-muted hover:text-foreground` treatment). Mark the active route as the nav already does. If `/rounds` and `/compare` pages don't exist yet, create them as the two sticky-orb hero pages above; otherwise just add the links.

---

## 5. Do-not-touch list

- Don't restyle or refactor any existing page, component, route, or API.
- Don't replace the token system or rename existing tokens — extend/align to the values in §1.
- Don't add new dependencies beyond `three`.
- Don't change auth, the workbook/Labs surfaces, pricing logic, or copy anywhere except adding the two nav links.
- Keep the accent strictly to the clay token — no new colors, no gradients-as-brand.

---

### Acceptance check
- Toggling theme crossfades the whole page **and** the orb color over ~0.45s, no flash on reload.
- All three orbs rotate on idle/scroll and **follow the cursor** smoothly.
- Light and dark both read correctly (warm paper / warm charcoal, single clay accent).
- Nav shows Rounds + Compare; everything else is unchanged.
