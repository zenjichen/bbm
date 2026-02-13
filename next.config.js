/** @type {import('next').NextConfig} */
const nextConfig = {
    images: { unoptimized: true },
    reactStrictMode: true,
    // No 'output: export' — we need server-side API routes for streaming
};

module.exports = nextConfig;
