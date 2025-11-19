/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Mark firebase-admin as a server-only package (Next.js 15+)
  serverExternalPackages: ['firebase-admin'],
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
