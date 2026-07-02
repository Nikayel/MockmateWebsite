import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Python Executor — CodeSparring",
  description: "A free, open Python scratchpad — write and run any code, right in your browser.",
}

export default function PythonExecutorLayout({ children }: { children: ReactNode }) {
  return children
}
