import { useState } from "react"
import SessionsPage from "@/app/admin/sessions/page"
import { UserProfileDrawer } from "@/components/admin/UserProfileDrawer"

/** Real admin entry points and inspector; Playwright substitutes only the protected API. */
export function AdminSessionFixture() {
  const [userOpen, setUserOpen] = useState(false)
  return (
    <div className="min-h-screen bg-[#1a1917] p-4 text-white">
      <button onClick={() => setUserOpen(true)}>Open learner profile</button>
      <SessionsPage />
      <UserProfileDrawer
        isOpen={userOpen}
        onClose={() => setUserOpen(false)}
        userId="learner"
        token="fixture-token"
      />
    </div>
  )
}
