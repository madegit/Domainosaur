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
    '*.kirk.replit.dev',
    '*.worf.replit.dev',
    '*.picard.replit.dev',
    'c96d86d2-c1e1-4e8b-91a0-cc65cbbe206e-00-30m0q5opiyuox.worf.replit.dev',
    'ef8ed370-6e88-41a7-86b7-a1d82e28d827-00-2sgh7vzej807a.picard.replit.dev',
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