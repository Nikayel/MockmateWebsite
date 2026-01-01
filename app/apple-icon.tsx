import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: 36,
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
              fontSize: 72,
              fontWeight: 900,
              color: '#00d9ff',
            }}
          >
            {'<'}
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: '#00d9ff',
            }}
          >
            ⚡
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#00ff88',
            }}
          >
            {'>'}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
