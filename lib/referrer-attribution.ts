/** Infer an untagged landing's channel without storing referrer paths or queries. */
export function getReferrerAttribution(referrer: string, currentHostname: string) {
  const direct = { source: "direct", medium: "none", referrer: undefined }
  try {
    const url = new URL(referrer)
    if (url.protocol !== "https:" && url.protocol !== "http:") return direct
    const hostname = url.hostname.replace(/^www\./, "")
    if (hostname === currentHostname.replace(/^www\./, "")) return direct

    const searchEngines: Array<[string, RegExp]> = [
      ["google", /(^|\.)google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/],
      ["bing", /(^|\.)bing\.com$/],
      ["duckduckgo", /(^|\.)duckduckgo\.com$/],
      ["yahoo", /(^|\.)search\.yahoo\.com$/],
      ["brave", /^search\.brave\.com$/],
    ]
    const searchEngine = searchEngines.find(([, pattern]) => pattern.test(hostname))
    return {
      source: searchEngine?.[0] ?? hostname.slice(0, 200),
      medium: searchEngine ? "organic" : "referral",
      referrer: url.origin.slice(0, 200),
    }
  } catch {
    return direct
  }
}
