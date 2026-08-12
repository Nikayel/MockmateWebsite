"use client"

interface GuestModeBannerProps {
  onSignUp: () => void
  /**
   * True when the site header is visible above the banner (scenario browser),
   * false in the chrome-less interview view where the banner sits at the very
   * top. The old version hardcoded top-[64px] and floated mid-workspace over
   * the session's top bar whenever the header was hidden.
   */
  belowHeader?: boolean
}

/**
 * Slim guest-trial strip. One quiet line on a neutral surface: the loud
 * accent-gradient three-sentence version pulled attention away from the
 * session it sat on, and the real sell now happens where intent peaks (the
 * chat wall and the post-feedback prompt). Fixed positioning is compensated
 * by the consumers (ScenarioBrowser's topPadding, the interview section's
 * conditional padding), so it overlays nothing.
 */
export function GuestModeBanner({ onSignUp, belowHeader = true }: GuestModeBannerProps) {
  return (
    <div
      className={`border-border bg-background/85 fixed right-0 left-0 z-40 border-b backdrop-blur-sm ${
        belowHeader ? "top-[64px]" : "top-0"
      }`}
    >
      <div className="container mx-auto flex h-9 items-center justify-between gap-3 px-4">
        <p className="text-muted-foreground truncate text-xs">
          <span className="text-accent-strong font-medium">Free trial</span>
          <span className="hidden sm:inline">
            {" "}
            · the AI interviewer unlocks with a free account: 8 sessions a month, no card
          </span>
        </p>
        <button
          type="button"
          onClick={onSignUp}
          className="text-accent-strong hover:text-accent flex-shrink-0 text-xs font-medium transition-colors"
        >
          Create free account
        </button>
      </div>
    </div>
  )
}
