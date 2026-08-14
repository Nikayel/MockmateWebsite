const REFERENCES = [
  {
    principle: "Spacing Effect",
    citation: (
      <>
        Cepeda, N.J., et al. (2006). Distributed practice in verbal recall tasks: A review and
        quantitative synthesis. <span className="italic">Psychological Bulletin, 132</span>(3),
        354-380.
      </>
    ),
  },
  {
    principle: "Testing Effect",
    citation: (
      <>
        Roediger, H.L., &amp; Karpicke, J.D. (2006). Test-enhanced learning.{" "}
        <span className="italic">Psychological Science, 17</span>(3), 249-255.
      </>
    ),
  },
  {
    principle: "Interleaving",
    citation: (
      <>
        Rohrer, D., &amp; Taylor, K. (2007). The shuffling of mathematics problems improves
        learning. <span className="italic">Instructional Science, 35</span>(6), 481-498.
      </>
    ),
  },
  {
    principle: "Forgetting Curve",
    citation: (
      <>
        Ebbinghaus, H. (1885).{" "}
        <span className="italic">Memory: A Contribution to Experimental Psychology.</span> Teachers
        College, Columbia University.
      </>
    ),
  },
  {
    principle: "Sleep Consolidation",
    citation: (
      <>
        Walker, M.P. (2017).{" "}
        <span className="italic">Why We Sleep: Unlocking the Power of Sleep and Dreams.</span>{" "}
        Scribner.
      </>
    ),
  },
  {
    principle: "SM-2 Algorithm",
    citation: (
      <>
        Wozniak, P.A., &amp; Gorzelanczyk, E.J. (1994). Optimization of repetition spacing in the
        practice of learning. <span className="italic">Acta Neurobiologiae Experimentalis, 54</span>
        , 59-62.
      </>
    ),
  },
]

/**
 * ResearchReferencesSection — the citation appendix.
 *
 * Same treatment as the rest of the page: `bg-background` surface, `border-border bg-card`
 * cells, and text that runs through the foreground/muted tokens instead of a gray ramp
 * that only ever resolved against black. The six entries are a list, so they are rendered
 * from one, rather than six copies of the same markup.
 */
export function ResearchReferencesSection() {
  return (
    <section className="bg-background border-border border-t py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-muted-foreground mb-8 text-center text-xs font-semibold tracking-[0.18em] uppercase">
            Scientific references
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {REFERENCES.map((ref) => (
              <div
                key={ref.principle}
                className="border-border bg-card rounded-xl border p-4 text-xs"
              >
                <p className="text-foreground mb-1 font-semibold">{ref.principle}</p>
                <p className="text-muted-foreground leading-relaxed">{ref.citation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
