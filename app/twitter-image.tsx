import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'CodeSparring - Ace Your Tech Interview with AI Mock Practice'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #00d9ff15 0%, transparent 50%), radial-gradient(circle at 75% 75%, #00ff8815 0%, transparent 50%)',
        }}
      >
        {/* Logo brackets */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: '#00d9ff',
              marginRight: 20,
            }}
          >
            {'<'}
          </span>
          <span
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#00d9ff',
            }}
          >
            ⚡
          </span>
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: '#00ff88',
              marginLeft: 20,
            }}
          >
            {'>'}
          </span>
        </div>

        {/* Brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: '-0.025em',
            marginBottom: 20,
          }}
        >
          <span style={{ color: '#ffffff' }}>Code</span>
          <span style={{ color: '#00d9ff' }}>Sparring</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Ace Your Tech Interview with AI Mock Practice
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 48,
          }}
        >
          {['Voice-Enabled', '24/7 Available', 'AI Feedback', '15 DSA Patterns'].map((feature) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 100,
                backgroundColor: '#ffffff10',
                border: '1px solid #ffffff20',
              }}
            >
              <span style={{ fontSize: 18, color: '#00ff88' }}>✓</span>
              <span style={{ fontSize: 18, color: '#e4e4e7' }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
