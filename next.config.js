/** @type {import('next').NextConfig} */
const nextConfig = {
  // Chromium (rendu PDF des fiches) : ne pas bundler, le binaire doit rester
  // résolvable côté fonction serverless.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  // ...et forcer l'inclusion du binaire Chromium (dossier bin/) dans la fonction
  // /api/fiche-terrain : le file tracing de Next ne l'embarque pas tout seul.
  outputFileTracingIncludes: {
    '/api/fiche-terrain': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
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
