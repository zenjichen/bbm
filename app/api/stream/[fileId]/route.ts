import { NextResponse } from 'next/server';
import axios from 'axios';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function GET(
    request: Request,
    { params }: { params: { fileId: string } }
) {
    if (!BOT_TOKEN) {
        return NextResponse.json({ error: 'Bot token missing' }, { status: 500 });
    }

    const { fileId } = params;

    try {
        // Fetch file path
        const res = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        if (!res.data.ok) {
            return NextResponse.json({ error: 'Failed to get file' }, { status: 404 });
        }

        const filePath = res.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        // Redirect to the file URL
        return NextResponse.redirect(fileUrl);
    } catch (error) {
        console.error("Stream error:", error);
        return NextResponse.json({ error: 'Failed to access Telegram API' }, { status: 500 });
    }
}
