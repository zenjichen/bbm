import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: /api/stream?id=FILE_ID
 * 
 * Pages Router API route — tự động bị bỏ qua khi build static export.
 * Chỉ hoạt động khi deploy trên Vercel hoặc server Node.js.
 * 
 * Proxy server-side để stream nhạc từ Google Drive.
 * Server fetch file từ Google Drive (không bị CORS) rồi stream cho client.
 * Hỗ trợ Range requests cho seeking trong audio player.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Cho phép cross-origin requests từ bất kỳ domain nào (GitHub Pages, v.v.)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

    // Xử lý OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // HEAD request dùng để kiểm tra proxy availability — trả về 400 nhanh nếu thiếu params
    if (req.method === 'HEAD') {
        const fileId = req.query.id as string;
        if (!fileId || fileId === 'ping_check') {
            return res.status(400).end();
        }
    }

    const fileId = req.query.id as string;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

    if (!fileId || !apiKey) {
        return res.status(400).json({ error: 'Missing file id or API key' });
    }

    try {
        // Build Google Drive download URL
        const driveUrl = `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&key=${apiKey}&acknowledgeAbuse=true&supportsAllDrives=true`;

        // Forward Range header for seeking support
        const headers: Record<string, string> = {};
        const rangeHeader = req.headers.range;
        if (rangeHeader) {
            headers['Range'] = rangeHeader;
        }

        const driveResponse = await fetch(driveUrl, { headers });

        if (!driveResponse.ok && driveResponse.status !== 206) {
            const errorText = await driveResponse.text();
            console.error(`[Stream API] Drive error ${driveResponse.status}:`, errorText.substring(0, 200));
            return res.status(driveResponse.status).json({
                error: `Google Drive returned ${driveResponse.status}`,
            });
        }

        // Check if response is HTML (virus scan page) instead of audio
        const contentType = driveResponse.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            console.error('[Stream API] Got HTML instead of audio - virus scan page detected');
            return res.status(502).json({
                error: 'Virus scan page detected',
            });
        }

        // Set response headers
        res.setHeader('Content-Type', contentType || 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const contentLength = driveResponse.headers.get('content-length');
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        const contentRange = driveResponse.headers.get('content-range');
        if (contentRange) {
            res.setHeader('Content-Range', contentRange);
            res.status(206);
        }

        // Stream the response body
        if (driveResponse.body) {
            const reader = driveResponse.body.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(Buffer.from(value));
                }
            } finally {
                reader.releaseLock();
            }
        }

        res.end();
    } catch (error: any) {
        console.error('[Stream API] Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Failed to stream' });
        }
    }
}

// Disable body parsing for streaming
export const config = {
    api: {
        responseLimit: false,
    },
};
