import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
        }}
      >
        <span style={{ color: '#00d9ff', fontWeight: 900 }}>{'<'}</span>
        <span style={{ color: '#00ff88', fontWeight: 900 }}>{'>'}</span>
      </div>
    ),
    {
      ...size,
    }
  )
}
