/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
    // In production: static export for GitHub Pages
    // In development: full Next.js server so API routes (/api/stream) work
    ...(isDev ? {} : { output: 'export' }),
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
