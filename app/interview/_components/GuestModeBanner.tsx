"use client"

interface GuestModeBannerProps {
  onSignUp: () => void
}

/**
 * Sticky guest-mode banner shown below the header during a free-trial interview.
 * Pure presentational markup — the visibility guard lives in the page.
 */
export function GuestModeBanner({ onSignUp }: GuestModeBannerProps) {
  return (
    <div className="from-accent/20 border-accent/30 to-accent/5 fixed top-[64px] right-0 left-0 z-40 border-b bg-gradient-to-r backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-accent font-medium">Free Trial</span>
          <span className="text-muted-foreground hidden sm:inline">
            Run your code against real interview tests and get your score. Create a free account
            to unlock the AI interviewer and full feedback. 8 free sessions a month, no credit
            card.
          </span>
        </div>
        <button
          onClick={onSignUp}
          className="text-accent hover:text-accent/80 font-medium transition-colors"
        >
          Sign up for unlimited access
        </button>
      </div>
    </div>
  )
}
