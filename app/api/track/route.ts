import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q');
    const topicId = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '200');

    try {
        const tracksPath = path.resolve(process.cwd(), 'data/tracks.json');
        const topicsPath = path.resolve(process.cwd(), 'data/topics.json');

        // Load tracks
        let tracks: any[] = [];
        if (fs.existsSync(tracksPath)) {
            tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
        }

        // Load topics
        let topics: any[] = [];
        if (fs.existsSync(topicsPath)) {
            topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
        }

        // Filter by topic
        if (topicId) {
            const tid = parseInt(topicId);
            tracks = tracks.filter(t => t.topic_id === tid);
        }

        // Search filter
        if (search) {
            const q = search.toLowerCase();
            tracks = tracks.filter(t =>
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.performer && t.performer.toLowerCase().includes(q))
            );
        }

        // Sort by date desc
        tracks.sort((a, b) => (b.date || 0) - (a.date || 0));

        return NextResponse.json({
            tracks: tracks.slice(0, limit),
            topics,
            total: tracks.length
        });
    } catch (error) {
        console.error('Track API error:', error);
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
    }
}
