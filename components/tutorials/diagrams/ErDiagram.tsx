import { Key, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import type { ErSpec } from "@/lib/tutorials/diagrams/schema"

const CARD_LABEL: Record<string, string> = {
  pk: "primary key",
  fk: "foreign key",
}

/**
 * ER / schema diagram (static). Renders each table as a labeled card of columns with
 * PK/FK badges, then lists the relationships with their cardinality. DOM tables + a
 * text relation list (not canvas), so it stays readable and accessible at the small
 * scale these lessons use (2–4 tables).
 */
export function ErDiagram({ spec }: { spec: ErSpec }) {
  return (
    <DiagramFrame label="Schema" caption={spec.caption}>
      <div className="flex flex-wrap gap-4">
        {spec.tables.map((table) => (
          <figure
            key={table.name}
            className="border-border min-w-[160px] overflow-hidden rounded-md border"
          >
            <figcaption className="bg-muted/50 text-foreground border-border border-b px-3 py-1.5 font-mono text-xs font-semibold">
              {table.name}
            </figcaption>
            <ul className="divide-border/60 divide-y">
              {table.columns.map((col) => (
                <li
                  key={col.name}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 font-mono text-xs",
                    col.key === "pk" && "bg-accent/5"
                  )}
                >
                  {col.key === "pk" && (
                    <Key className="text-accent-strong size-3" aria-label={CARD_LABEL.pk} />
                  )}
                  {col.key === "fk" && (
                    <Link2 className="size-3 text-blue-500" aria-label={CARD_LABEL.fk} />
                  )}
                  <span className={cn(!col.key && "ml-[18px]", "text-foreground")}>{col.name}</span>
                  {col.type && (
                    <span className="text-muted-foreground ml-auto text-[10px]">{col.type}</span>
                  )}
                </li>
              ))}
            </ul>
          </figure>
        ))}
      </div>

      {spec.relations && spec.relations.length > 0 && (
        <ul className="mt-4 space-y-1">
          {spec.relations.map((rel, i) => (
            <li key={i} className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
              <span className="text-foreground">{rel.from}</span>
              <span className="text-accent-strong">{rel.kind}</span>
              <span className="text-foreground">{rel.to}</span>
              {/* The relationship's meaning, e.g. "places" — the edge's whole point. */}
              {rel.label && <span className="text-muted-foreground">— {rel.label}</span>}
            </li>
          ))}
        </ul>
      )}
    </DiagramFrame>
  )
}
