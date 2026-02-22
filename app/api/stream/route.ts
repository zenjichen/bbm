import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Google Drive audio streaming.
 * This bypasses CORS because the request is made server → Google Drive.
 * The browser only talks to our own domain.
 *
 * Usage: GET /api/stream?id=<fileId>
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
        return new NextResponse('Missing file id', { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
        return new NextResponse('Server misconfigured: missing API key', { status: 500 });
    }

    // Build the Google Drive media URL
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${apiKey}&supportsAllDrives=true`;

    // Forward Range header from client (for seek support)
    const rangeHeader = request.headers.get('range');
    const fetchHeaders: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (compatible; BBMusicProxy/1.0)',
    };
    if (rangeHeader) {
        fetchHeaders['Range'] = rangeHeader;
    }

    let driveRes: Response;
    try {
        driveRes = await fetch(driveUrl, {
            headers: fetchHeaders,
            redirect: 'follow',
        });
    } catch (e: any) {
        console.error('[Stream] Fetch error:', e.message);
        return new NextResponse('Failed to reach Google Drive', { status: 502 });
    }

    if (!driveRes.ok && driveRes.status !== 206) {
        const body = await driveRes.text().catch(() => '');
        console.error('[Stream] Drive error:', driveRes.status, body.slice(0, 200));
        return new NextResponse(`Google Drive error: ${driveRes.status}`, {
            status: driveRes.status,
        });
    }

    // Pass through the audio stream with appropriate headers
    const contentType = driveRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = driveRes.headers.get('content-length');
    const contentRange = driveRes.headers.get('content-range');
    const acceptRanges = driveRes.headers.get('accept-ranges') || 'bytes';

    const responseHeaders: HeadersInit = {
        'Content-Type': contentType,
        'Accept-Ranges': acceptRanges,
        'Cache-Control': 'public, max-age=3600',
        // Allow the browser audio element to access this
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    };

    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new NextResponse(driveRes.body, {
        status: driveRes.status,
        headers: responseHeaders,
    });
}

// Also handle HEAD requests (browsers use these to check range support)
export async function HEAD(request: NextRequest) {
    return GET(request);
}
