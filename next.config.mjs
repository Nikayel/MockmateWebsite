/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack config to use Turbopack with custom webpack config
  turbopack: {},
  // TypeScript errors must be fixed - do not ignore build errors in production
  // This was previously set to true which masked real bugs
  images: {
    // Enable Next.js image optimization for better performance
    unoptimized: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
      },
    ],
  },
  // Mark firebase-admin as a server-only package (Next.js 15+)
  serverExternalPackages: ['firebase-admin'],
  // Handle nested dependencies
  transpilePackages: ['tunnel-rat'],
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://cdn.jsdelivr.net https://apis.google.com https://*.googleapis.com https://www.gstatic.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://*.firebase.googleapis.com https://*.google-analytics.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://oauth2.googleapis.com https://www.googleapis.com wss://*.firebaseio.com https://api.stripe.com https://cdn.jsdelivr.net wss://api.deepgram.com wss://*.deepgram.com",
              "worker-src 'self' blob: https://cdn.jsdelivr.net",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://accounts.google.com https://*.googleapis.com https://*.firebaseapp.com https://*.web.app",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ],
      },
    ]
  },
  // Exclude extension directory from Next.js build and watch
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/extension/**', '**/node_modules/**'],
    }

    // Exclude firebase-admin from client-side bundle (server-only package)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
      }

      // Externalize firebase-admin for client builds
      const originalExternals = config.externals
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : originalExternals ? [originalExternals] : []),
        ({ request }, callback) => {
          if (request === 'firebase-admin') {
            return callback(null, 'commonjs ' + request)
          }
          if (typeof originalExternals === 'function') {
            return originalExternals({ request }, callback)
          }
          callback()
        },
      ]
    }

    return config
  },
}

export default nextConfig
