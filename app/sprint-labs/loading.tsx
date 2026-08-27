import { SparraLoader } from "@/components/brand/SparraLoader"

/** UX-SPEC.md §13: route-level loading for the Sprint Labs surface, matching `app/learn/loading.tsx`. */
export default function SprintLabsLoading() {
  return <SparraLoader fullPage label="Loading Sprint Labs…" />
}
