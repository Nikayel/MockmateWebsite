export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a1917]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-border border-t-[#c4703f] rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground text-sm font-medium">Loading interview...</p>
      </div>
    </div>
  )
}
