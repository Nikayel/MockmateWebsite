// KaTeX stylesheet as a side-effect-only module. MarkdownRenderer dynamically
// imports this so the KaTeX CSS is code-split out of the eager /interview bundle
// and only fetched when the markdown source actually contains math. Importing it
// statically here keeps the exact side-effect form that already works under the
// Next bundler, while giving MarkdownRenderer a normal module to `import(...)`.
import "katex/dist/katex.min.css"
