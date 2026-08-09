export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1917]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="border-border border-t-accent h-16 w-16 animate-spin rounded-full border-4"></div>
        </div>
        <p className="text-muted-foreground text-sm font-medium">Loading interview...</p>
      </div>
    </div>
  )
}
