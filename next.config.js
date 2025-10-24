/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly disable static export - we need server-side rendering for API routes
  // Do not set output: 'export' as we have dynamic API routes

  // Server Actions are available by default in Next.js 14+
}

module.exports = nextConfig
