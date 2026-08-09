import { sparraMarkDataUri, SPARRA_OG_COLORS } from "@/lib/brand/sparra-mark"

/**
 * The shared 1200x630 social card (OG + Twitter render the same art):
 * Sparra mark, single-ink wordmark, tagline, feature pills on the void.
 * Consumed by app/opengraph-image.tsx and app/twitter-image.tsx via satori.
 */
export function SparringOgCard() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SPARRA_OG_COLORS.background,
        backgroundImage:
          "radial-gradient(circle at 50% 20%, #ff8a3d1f 0%, transparent 55%), radial-gradient(circle at 80% 90%, #e0552a14 0%, transparent 50%)",
      }}
    >
      {/* Sparra mark */}
      <div
        style={{
          display: "flex",
          marginBottom: 44,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sparraMarkDataUri(148)} width={148} height={148} alt="" />
      </div>

      {/* Brand name — single ink per the brand lockup */}
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginBottom: 20,
          color: SPARRA_OG_COLORS.ink,
        }}
      >
        CodeSparring
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 32,
          color: SPARRA_OG_COLORS.muted,
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.4,
        }}
      >
        Ace Your Tech Interview with AI Mock Practice
      </div>

      {/* Features */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginTop: 48,
        }}
      >
        {["Voice-Enabled", "24/7 Available", "AI Feedback", "15+ DSA Patterns"].map((feature) => (
          <div
            key={feature}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: 100,
              backgroundColor: "#ffffff0d",
              border: "1px solid #ffffff1c",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: SPARRA_OG_COLORS.ember,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 18, color: SPARRA_OG_COLORS.ink }}>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
