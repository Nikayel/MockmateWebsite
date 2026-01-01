import { ImageResponse } from 'next/og'
import { getBlogPostBySlug } from '@/lib/mdx'

export const runtime = 'nodejs'

export const alt = 'CodeSparring Blog'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  const title = post?.title || 'CodeSparring Blog'
  const category = post?.category || 'guides'

  const categoryColors: Record<string, { bg: string; text: string }> = {
    dsa: { bg: '#1e40af', text: '#93c5fd' },
    faang: { bg: '#7c3aed', text: '#c4b5fd' },
    'system-design': { bg: '#15803d', text: '#86efac' },
    career: { bg: '#b45309', text: '#fcd34d' },
    guides: { bg: '#0891b2', text: '#67e8f9' },
  }

  const colors = categoryColors[category] || categoryColors.guides

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0a',
          padding: 60,
        }}
      >
        {/* Top bar with logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 900, color: '#00d9ff' }}>{'<'}</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#00d9ff' }}>⚡</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#00ff88' }}>{'>'}</span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginLeft: 16,
                color: '#ffffff',
              }}
            >
              CodeSparring Blog
            </span>
          </div>

          {/* Category badge */}
          <div
            style={{
              display: 'flex',
              padding: '12px 24px',
              borderRadius: 100,
              backgroundColor: colors.bg,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 600, color: colors.text }}>
              {category.toUpperCase().replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: title.length > 60 ? 48 : 56,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 20, color: '#71717a' }}>
            codesparring.dev/blog
          </span>
          <div
            style={{
              display: 'flex',
              gap: 16,
            }}
          >
            {['DSA', 'Interview Prep', 'AI Practice'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 16,
                  color: '#a1a1aa',
                  padding: '8px 16px',
                  borderRadius: 100,
                  backgroundColor: '#27272a',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
