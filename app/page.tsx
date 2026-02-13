import db from '@/lib/db';
import TrackList from '@/components/TrackList';
import TopicGrid from '@/components/TopicGrid';
import SearchInput from '@/components/SearchInput';
import { Track } from "@/context/PlayerContext";

export default function Home({ searchParams }: { searchParams: { q?: string, topic?: string } }) {
    const query = searchParams.q || '';
    const topicId = searchParams.topic ? parseInt(searchParams.topic) : null;

    let tracks: Track[] = [];
    let topics: { id: number, name: string }[] = [];

    try {
        // Determine what to show
        if (query) {
            // Search mode
            const stmt = db.prepare(`
        SELECT id, file_id, title, performer, duration, topic_id 
        FROM tracks 
        WHERE title LIKE ? OR performer LIKE ? 
        ORDER BY date DESC LIMIT 100
      `);
            tracks = stmt.all(`%${query}%`, `%${query}%`) as Track[];
        } else if (topicId) {
            // Topic mode
            const stmt = db.prepare(`
        SELECT id, file_id, title, performer, duration, topic_id
        FROM tracks 
        WHERE topic_id = ? 
        ORDER BY date DESC
      `);
            tracks = stmt.all(topicId) as Track[];
        } else {
            // Home mode: Get Topics & Recent
            const recentStmt = db.prepare(`
        SELECT id, file_id, title, performer, duration, topic_id
        FROM tracks 
        ORDER BY date DESC LIMIT 20
      `);
            tracks = recentStmt.all() as Track[];

            const topicStmt = db.prepare(`
        SELECT DISTINCT topic_id as id, topic_name as name 
        FROM tracks 
        WHERE topic_id IS NOT NULL
      `);
            topics = topicStmt.all() as { id: number, name: string }[];
            // If name is null, default
            topics = topics.map(t => ({ ...t, name: t.name || `Topic ${t.id}` }));
        }
    } catch (err) {
        console.error("DB Error:", err);
        // Fallback or empty
    }

    return (
        <main>
            <div className="flex justify-center mb-8">
                <SearchInput initialQuery={query} />
            </div>

            {/* If we are NOT searching and NOT viewing a topic, show topics grid */}
            {!query && !topicId && topics.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-semibold mb-4 text-zinc-300 border-l-4 border-cyan-500 pl-3">
                        Playlists
                    </h2>
                    <TopicGrid topics={topics} />
                </div>
            )}

            {/* Tracks List */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-zinc-300 border-l-4 border-cyan-500 pl-3">
                    {query ? `Results for "${query}"` : topicId ? `Playlist: Topic ${topicId}` : "Recent Uploads"}
                </h2>
                <TrackList tracks={tracks} />
            </div>
        </main>
    );
}
