/** @type {import('next').NextConfig} */

const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
    // Static export chỉ khi deploy GitHub Pages (STATIC_EXPORT=true)
    // Vercel deploy sẽ dùng dynamic mode (hỗ trợ API routes)
    ...(isStaticExport ? { output: 'export' } : {}),
    trailingSlash: true,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    images: {
        unoptimized: true,
        domains: ['lh3.googleusercontent.com', 'drive.google.com', 'picsum.photos'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
}

module.exports = nextConfig
