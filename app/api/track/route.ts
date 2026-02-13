import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q');
    const topicId = searchParams.get('topic');
    const limit = searchParams.get('limit') || '50';

    let query = `SELECT * FROM tracks WHERE 1=1`;
    const params = [];

    if (topicId) {
        query += ` AND topic_id = ?`;
        params.push(topicId);
    }

    if (search) {
        query += ` AND (title LIKE ? OR performer LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY date DESC LIMIT ?`;
    params.push(parseInt(limit));

    try {
        const stmt = db.prepare(query);
        const tracks = stmt.all(...params);
        return NextResponse.json(tracks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
    }
}
