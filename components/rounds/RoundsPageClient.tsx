"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ThreeOrb } from "@/components/three/ThreeOrb"
import { Bug, Bot, Layers, CheckCircle2, Building2 } from "lucide-react"
import { motion } from "framer-motion"

// Case Lab milestone flow shown in the right showcase panel.
const milestones = [
  { label: "Clarify", state: "done" },
  { label: "Decompose", state: "done" },
  { label: "Design", state: "active" },
  { label: "Build", state: "todo" },
  { label: "Review", state: "todo" },
] as const

/**
 * Rounds page — a dedicated home for the twin-panel "two rounds" mockup that
 * used to sit in the hero. A tall sticky section drives a scroll-reactive
 * torus-knot orb; the heading reads over a theme scrim. The mockup itself is a
 * solid dark "product render" resting in a dark frame (Design.md's
 * product-tile-dark idea) so it stays crisp in both light and dark themes.
 */
export function RoundsPageClient() {
  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <Header />

      {/* Sticky scroll-reactive orb hero */}
      <section data-orb-section className="relative" style={{ height: "160vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          <ThreeOrb variant="knot" />
          {/* Soft scrim — lifts heading contrast without hiding the orb. */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(ellipse 58% 50% at 50% 50%, var(--bg) 10%, transparent 72%)",
              opacity: 0.7,
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textShadow: "0 1px 24px var(--bg)" }}
            className="relative z-10 mx-auto max-w-2xl px-4 text-center"
          >
            <p className="text-accent mb-4 text-sm font-medium tracking-[0.14em] uppercase">
              Two rounds, one session
            </p>
            <h1 className="text-foreground mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
              The rounds LeetCode skips
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-xl leading-relaxed">
              A failing test to debug, and a real-world case to design — with an AI interviewer that
              reacts as you work.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The relocated twin-panel mockup, framed as a dark product render. */}
      <section className="relative z-10 pb-28">
        <div className="container mx-auto px-4">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-muted-foreground mx-auto mb-8 max-w-[1000px] text-xs tracking-widest uppercase"
          >
            What a session looks like
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-[1000px] rounded-[28px] border border-white/[0.06] bg-[#161513] p-4 shadow-[0_5px_30px_rgba(0,0,0,0.22)] sm:p-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Bug Fix panel */}
              <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#232220] text-left">
                <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2926] px-4">
                  <Bug className="text-accent h-3.5 w-3.5" />
                  <span className="text-xs font-semibold tracking-wide text-[#e3ded3]">
                    Bug Fix
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-[#c5c1b6]/60">
                    checkout total returns NaN
                  </span>
                </div>
                <div className="flex flex-col gap-4 p-5 font-mono text-sm leading-6 text-[#c5c1b6]">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-[#ffb4ab]/15 px-2 py-0.5 font-semibold text-[#ffb4ab]">
                      ✕ 1 failing
                    </span>
                    <span className="text-[#c5c1b6]/60">cart.test.ts › applies discount</span>
                  </div>
                  <pre className="text-[13px] whitespace-pre-wrap">
                    <span className="text-[#ffb4ab]">
                      {"expect(total).toBe(90)  // Received: NaN"}
                    </span>
                    {"\n"}
                    <span className="text-accent">function</span>{" "}
                    <span className="text-[#ece9e1]">applyDiscount</span>(price, pct) {"{"}
                    {"\n  "}
                    <span className="text-[#ffb786]">{'// pct arrives as "20", not 0.2'}</span>
                    {"\n  "}
                    <span className="text-accent">return</span> price - price * pct;{"\n}"}
                  </pre>
                  <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 font-sans text-xs text-[#c5c1b6]/80">
                    <Bot className="text-accent mb-1 inline h-3.5 w-3.5" />{" "}
                    <span className="text-[#e3ded3]">
                      Before you change the formula, what are the actual types of price and pct?
                    </span>
                  </div>
                </div>
              </div>

              {/* Case Lab panel */}
              <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#232220] text-left">
                <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2926] px-4">
                  <Layers className="text-accent h-3.5 w-3.5" />
                  <span className="text-xs font-semibold tracking-wide text-[#e3ded3]">
                    Case Lab
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded bg-[#7c4a2d] px-2 py-0.5 text-[11px] font-medium text-white">
                    <Building2 className="h-3 w-3" />
                    Palantir · FDSE
                  </span>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  <ol className="flex flex-col gap-2">
                    {milestones.map(({ label, state }) => (
                      <li key={label} className="flex items-center gap-2.5 text-sm">
                        {state === "done" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4cc79b]" />
                        ) : (
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              state === "active" ? "bg-accent" : "bg-white/20"
                            }`}
                          />
                        )}
                        <span
                          className={
                            state === "active"
                              ? "text-accent font-semibold"
                              : state === "done"
                                ? "text-[#c5c1b6] line-through"
                                : "text-[#c5c1b6]/50"
                          }
                        >
                          {label}
                        </span>
                        {state === "active" && (
                          <span className="ml-auto rounded bg-[#c4703f]/15 px-2 py-0.5 text-[11px] font-medium text-[#e0a074]">
                            you are here
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#c5c1b6]/80">
                    <Bot className="text-accent mb-1 inline h-3.5 w-3.5" />{" "}
                    <span className="text-[#e3ded3]">
                      Good scope. So what&apos;s the contract for the dispatch API, and which
                      tradeoff are you defending?
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
