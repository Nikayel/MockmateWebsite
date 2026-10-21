import Link from "next/link"
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const GUIDED_LABS_PATH = "/interview?track=debugging&view=guided-labs"

export function GuidedLabsEntry({ browsingLabs = false }: { browsingLabs?: boolean }) {
  if (browsingLabs)
    return (
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/interview?track=debugging">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to debugging rounds
          </Link>
        </Button>
        <Badge variant="outline">New &amp; improved</Badge>
        <Badge variant="secondary">Beta</Badge>
      </div>
    )
  return (
    <section
      aria-label="Guided debugging labs"
      className="border-accent/30 bg-accent/5 mb-6 rounded-xl border p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen className="text-accent-strong h-4 w-4" aria-hidden="true" />
        <h2 className="text-foreground text-sm font-semibold">Guided debugging labs</h2>
        <Badge variant="outline" className="border-accent/40 text-accent-strong">
          New &amp; improved
        </Badge>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">Phased repairs, from easy to hard.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={GUIDED_LABS_PATH}>
            Explore guided labs
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
