/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow all hosts for Replit proxy
  experimental: {
    allowedRevalidateHeaderKeys: ['*']
  },
  // Configure allowed development origins for Replit
  allowedDevOrigins: [
    '*.replit.dev',
    '*.repl.co',
    '*.spock.replit.dev',
    '095b7487-720f-42ad-9d4a-b2f5dba75e5d-00-ippnmf5i1srl.spock.replit.dev',
    '127.0.0.1',
    'localhost',
    '0.0.0.0'
  ],
  // Disable strict mode to avoid development warnings
  reactStrictMode: false,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;