import type { SessionWork } from "@/lib/admin/session-review/work"
import { absoluteTime } from "@/lib/admin/session-display"

export function SavedWork({ work }: { work: SessionWork }) {
  return (
    <section aria-label="Saved work" className="space-y-3">
      <h3 className="font-semibold text-white">Saved work</h3>
      <dl className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Language</dt>
          <dd>{work.language ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">
            Tests{" "}
            {work.testSource === "checkpoint"
              ? "(checkpoint)"
              : work.testSource === "final"
                ? "(final)"
                : ""}
          </dt>
          <dd>
            {work.testsTotal === null
              ? "Not recorded"
              : `${work.testsPassed ?? "Unknown"} / ${work.testsTotal} passed`}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Checkpoint saved</dt>
          <dd>{absoluteTime(work.savedAt)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Paused at checkpoint</dt>
          <dd>{work.paused === null ? "Not recorded" : work.paused ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Elapsed at checkpoint</dt>
          <dd>
            {work.elapsedSeconds === null
              ? "Not recorded"
              : `${Math.floor(work.elapsedSeconds / 60)}m ${work.elapsedSeconds % 60}s`}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Complexity (time / space)</dt>
          <dd>
            {work.timeComplexity ?? "Not recorded"} / {work.spaceComplexity ?? "Not recorded"}
          </dd>
        </div>
      </dl>
      {work.truncated && (
        <p className="text-sm text-amber-300">
          Large code or workspace snapshots are shortened in this preview.
        </p>
      )}
      {work.code !== null ? (
        <CodePreview
          title={work.codeSource === "final" ? "Final saved code" : "Code at checkpoint"}
          code={work.code}
        />
      ) : work.files.length === 0 ? (
        <p className="text-sm text-gray-400">No code was saved for this session.</p>
      ) : null}
      {work.files.length > 0 && (
        <p className="text-xs text-gray-400">
          Editable workspace files from the recovery checkpoint.
        </p>
      )}
      {work.files.map((file, index) => (
        <CodePreview key={`${file.path}-${index}`} title={file.path} code={file.content} />
      ))}
    </section>
  )
}

function CodePreview({ title, code }: { title: string; code: string }) {
  return (
    <details className="min-w-0 rounded-md border border-gray-800 bg-gray-950/50">
      <summary className="cursor-pointer p-3 text-sm break-words text-[#e0a077] focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none">
        {title}
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-gray-800 p-3 text-xs text-gray-300">
        <code>{code}</code>
      </pre>
    </details>
  )
}
