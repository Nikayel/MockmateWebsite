// Strip comments helper for JS/TS and Python
export function stripComments(code: string, language: string): string {
  if (language === "python") {
    let clean = code.replace(/"""[\s\S]*?"""/g, "")
    clean = clean.replace(/'''[\s\S]*?'''/g, "")
    clean = clean
      .split("\n")
      .map((line) => {
        if (/^\s*#/.test(line)) return ""
        const hashIdx = line.indexOf("#")
        if (hashIdx !== -1) {
          const preHash = line.substring(0, hashIdx)
          const singleQuoteCount = (preHash.match(/'/g) || []).length
          const doubleQuoteCount = (preHash.match(/"/g) || []).length
          if (singleQuoteCount % 2 === 0 && doubleQuoteCount % 2 === 0) {
            return preHash.trimEnd()
          }
        }
        return line
      })
      .join("\n")
    return clean
  } else {
    let clean = code.replace(/\/\*[\s\S]*?\*\//g, "")
    clean = clean
      .split("\n")
      .map((line) => {
        if (/^\s*\/\//.test(line)) return ""
        const slashIdx = line.indexOf("//")
        if (slashIdx !== -1) {
          const preSlash = line.substring(0, slashIdx)
          const singleQuoteCount = (preSlash.match(/'/g) || []).length
          const doubleQuoteCount = (preSlash.match(/"/g) || []).length
          const backtickCount = (preSlash.match(/`/g) || []).length
          if (singleQuoteCount % 2 === 0 && doubleQuoteCount % 2 === 0 && backtickCount % 2 === 0) {
            return preSlash.trimEnd()
          }
        }
        return line
      })
      .join("\n")
    return clean
  }
}
