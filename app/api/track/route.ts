import { NextResponse } from 'next/server';
import { getPlaylists, getTracksInPlaylist, getAllTracks } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

/**
 * GET /api/track
 * Query params:
 *   q       - search term (title or performer)
 *   topic   - playlist folder ID to filter
 *   limit   - max tracks to return (default 500)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q');
    const playlistId = searchParams.get('topic'); // 'topic' kept for UI compatibility
    const limit = parseInt(searchParams.get('limit') || '500');

    try {
        let tracks;
        let topics;

        if (playlistId) {
            // Fetch tracks for a specific playlist
            const [playlistTracks, playlists] = await Promise.all([
                getTracksInPlaylist(playlistId),
                getPlaylists(),
            ]);
            tracks = playlistTracks;
            topics = playlists.map(pl => ({ id: pl.id, name: pl.name }));
        } else {
            // Fetch all playlists and tracks
            const { playlists, tracks: allTracks } = await getAllTracks();
            tracks = allTracks;
            topics = playlists.map(pl => ({ id: pl.id, name: pl.name, trackCount: pl.trackCount }));
        }

        // Convert Drive track to UI-compatible format
        // Map playlist_id → topic_id (string-based now)
        let uiTracks = tracks.map(t => ({
            ...t,
            topic_id: t.playlist_id, // UI still uses topic_id
        }));

        // Filter by search query
        if (search) {
            const q = search.toLowerCase();
            uiTracks = uiTracks.filter(t =>
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.performer && t.performer.toLowerCase().includes(q)) ||
                (t.name && t.name.toLowerCase().includes(q))
            );
        }

        // Sort by date descending
        uiTracks.sort((a, b) => (b.date || 0) - (a.date || 0));

        return NextResponse.json({
            tracks: uiTracks.slice(0, limit),
            topics,
            total: uiTracks.length,
        });
    } catch (error: any) {
        console.error('Track API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch tracks from Google Drive' },
            { status: 500 }
        );
    }
}
