import type { ReactNode } from "react"

export function InterviewSurfaceFrame({
  children,
  header,
  hasGuestBanner = false,
}: {
  children: ReactNode
  header?: ReactNode
  hasGuestBanner?: boolean
}) {
  return (
    <section
      className={`bg-background flex h-dvh flex-col overflow-hidden pb-1.5 ${hasGuestBanner ? "pt-[42px]" : "pt-1.5"}`}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-1 overflow-hidden px-2 lg:px-3">
        {header}
        {children}
      </div>
    </section>
  )
}
