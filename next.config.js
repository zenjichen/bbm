/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',           // Static HTML export for GitHub Pages
    trailingSlash: true,        // Required for GitHub Pages routing
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    images: {
        unoptimized: true,      // Required for static export
        domains: ['lh3.googleusercontent.com', 'drive.google.com'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
}

module.exports = nextConfig
