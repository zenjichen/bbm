import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function GET(
    request: Request,
    { params }: { params: { fileId: string } }
) {
    if (!BOT_TOKEN) {
        return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const { fileId } = params;

    try {
        // Step 1: Get file path from Telegram
        const fileInfoRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`,
            { cache: 'no-store' }
        );

        const fileInfo = await fileInfoRes.json();

        if (!fileInfo.ok) {
            console.error('Telegram getFile error:', fileInfo);
            return NextResponse.json({ error: 'File not found on Telegram' }, { status: 404 });
        }

        const filePath = fileInfo.result.file_path;
        const telegramFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        // Step 2: Proxy the file content (stream it through our server)
        // This avoids CORS issues and hides the bot token
        const range = request.headers.get('range');

        const headers: Record<string, string> = {};
        if (range) {
            headers['Range'] = range;
        }

        const fileRes = await fetch(telegramFileUrl, {
            headers,
            cache: 'no-store',
        });

        if (!fileRes.ok && fileRes.status !== 206) {
            return NextResponse.json({ error: 'Failed to fetch file' }, { status: fileRes.status });
        }

        const contentType = fileRes.headers.get('content-type') || 'audio/mpeg';
        const contentLength = fileRes.headers.get('content-length');
        const contentRange = fileRes.headers.get('content-range');
        const acceptRanges = fileRes.headers.get('accept-ranges');

        const responseHeaders: Record<string, string> = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
        };

        if (contentLength) responseHeaders['Content-Length'] = contentLength;
        if (contentRange) responseHeaders['Content-Range'] = contentRange;
        if (acceptRanges) responseHeaders['Accept-Ranges'] = acceptRanges;

        return new Response(fileRes.body, {
            status: fileRes.status,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error('Stream proxy error:', error);
        return NextResponse.json({ error: 'Failed to stream' }, { status: 500 });
    }
}
