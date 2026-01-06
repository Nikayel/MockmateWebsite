export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-800 border-t-[#00d9ff] rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm font-medium">Loading dashboard...</p>
      </div>
    </div>
  )
}
