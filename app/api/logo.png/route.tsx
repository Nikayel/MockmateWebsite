import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Serve a large PNG icon for SEO/structured data at /api/logo.png
export async function GET(request: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 64,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: '#c4703f',
            }}
          >
            {'<'}
          </span>
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: '#c4703f',
            }}
          >
            ⚡
          </span>
          <span
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: '#3fb883',
            }}
          >
            {'>'}
          </span>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  )
}
