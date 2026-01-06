export function ResearchReferencesSection() {
  return (
    <section className="py-16 bg-gray-950/50 border-t border-gray-800/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6 text-center">
            Scientific References
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
              <p className="font-medium text-gray-500 mb-1">Spacing Effect</p>
              <p>Cepeda, N.J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. <span className="italic">Psychological Bulletin, 132</span>(3), 354-380.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
              <p className="font-medium text-gray-500 mb-1">Testing Effect</p>
              <p>Roediger, H.L., & Karpicke, J.D. (2006). Test-enhanced learning. <span className="italic">Psychological Science, 17</span>(3), 249-255.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
              <p className="font-medium text-gray-500 mb-1">Interleaving</p>
              <p>Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. <span className="italic">Instructional Science, 35</span>(6), 481-498.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
              <p className="font-medium text-gray-500 mb-1">Forgetting Curve</p>
              <p>Ebbinghaus, H. (1885). <span className="italic">Memory: A Contribution to Experimental Psychology.</span> Teachers College, Columbia University.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
              <p className="font-medium text-gray-500 mb-1">Sleep Consolidation</p>
              <p>Walker, M.P. (2017). <span className="italic">Why We Sleep: Unlocking the Power of Sleep and Dreams.</span> Scribner.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
              <p className="font-medium text-gray-500 mb-1">SM-2 Algorithm</p>
              <p>Wozniak, P.A., & Gorzelanczyk, E.J. (1994). Optimization of repetition spacing in the practice of learning. <span className="italic">Acta Neurobiologiae Experimentalis, 54</span>, 59-62.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
