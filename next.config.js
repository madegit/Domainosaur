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
    '5712ab05-2de5-49f1-813c-0745b492818f-00-tpu3ofwkju69.worf.replit.dev',
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