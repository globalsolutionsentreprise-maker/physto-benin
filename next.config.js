/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Photos de réalisations stockées dans le bucket public Supabase.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ijgjdtfaimamcrrnyrvk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // All pages except the RH iframe route
        source: '/((?!api/rh-frame).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
