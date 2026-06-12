const modules = [
  "@langchain/langgraph-checkpoint",
  "@langchain/langgraph",
  "js-tiktoken",
  "vaul",
  "@pinecone-database/pinecone",
  "fsevents",
  "@next/swc-darwin-arm64",
  "sharp",
  "lightningcss-darwin-arm64",
  "@tailwindcss/oxide-darwin-arm64",
  "@img/sharp-darwin-arm64",
]

;(async () => {
  for (const m of modules) {
    try {
      console.log(`\n== requiring ${m} ==`)
      const resolved = require.resolve(m)
      console.log("resolved ->", resolved)
      const mod = require(m)
      console.log(`OK: ${m} required successfully`)
    } catch (err) {
      console.error(`ERROR requiring ${m}:`, err && (err.stack || err.message || err))
    }
  }
  console.log("\nDone")
})()
