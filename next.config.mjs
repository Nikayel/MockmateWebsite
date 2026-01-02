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
            value: 'max-age=31536000; includeSubDomains; preload'
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
            // Allow Firebase OAuth popups to communicate with opener
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()'
          },
          {
            // Content Security Policy - Hardened configuration
            // SECURITY NOTE: 'unsafe-inline' for scripts/styles is required for Next.js.
            // This is a known limitation. For stricter security, implement nonce-based CSP.
            // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
            key: 'Content-Security-Policy',
            value: [
              // Default: only allow same-origin resources
              "default-src 'self'",

              // Scripts: Minimum required for Next.js + integrations
              // - unsafe-inline: Required for Next.js hydration (cannot be removed without nonces)
              // - wasm-unsafe-eval: Required for Monaco editor WebAssembly
              // - NO unsafe-eval: Blocked to prevent XSS code execution
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://cdn.jsdelivr.net https://apis.google.com https://*.googleapis.com https://www.gstatic.com https://accounts.google.com",

              // Styles: Required for Next.js + external fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",

              // Images: Allow data URIs and HTTPS sources
              "img-src 'self' data: https: blob:",

              // Fonts: Google Fonts only
              "font-src 'self' data: https://fonts.gstatic.com",

              // API connections: Explicitly listed trusted endpoints
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://*.firebase.googleapis.com https://*.google-analytics.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://oauth2.googleapis.com https://www.googleapis.com wss://*.firebaseio.com https://api.stripe.com https://cdn.jsdelivr.net wss://api.deepgram.com wss://*.deepgram.com https://emkc.org",

              // Workers: Monaco editor and code sandbox
              "worker-src 'self' blob: https://cdn.jsdelivr.net",

              // Iframes: Payment + auth only (no arbitrary embedding)
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://accounts.google.com https://*.googleapis.com https://*.firebaseapp.com https://*.web.app",

              // Hard blocks for dangerous features
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
              "frame-ancestors 'self'",
              "manifest-src 'self'",
              "media-src 'self' blob:",

              // Force HTTPS
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
