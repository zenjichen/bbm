import TrackList from '@/components/TrackList';
import TopicGrid from '@/components/TopicGrid';
import SearchInput from '@/components/SearchInput';
import { Track } from "@/context/PlayerContext";
import fs from 'fs';
import path from 'path';

// Load tracks from JSON
function getTracks(): Track[] {
    try {
        const dataPath = path.resolve(process.cwd(), 'data/tracks.json');
        if (!fs.existsSync(dataPath)) return [];
        const raw = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

// Load topics from JSON
function getTopics(): { id: number; name: string }[] {
    try {
        const dataPath = path.resolve(process.cwd(), 'data/topics.json');
        if (!fs.existsSync(dataPath)) return [];
        const raw = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export const dynamic = 'force-dynamic';

export default function Home({ searchParams }: { searchParams: { q?: string; topic?: string } }) {
    const query = searchParams.q || '';
    const topicId = searchParams.topic ? parseInt(searchParams.topic) : null;

    let allTracks = getTracks();
    const allTopics = getTopics();
    let displayTracks: Track[] = [];

    // Sort by date desc
    allTracks.sort((a, b) => (b.date || 0) - (a.date || 0));

    // Build topic lookup
    const topicMap = new Map(allTopics.map(t => [t.id, t.name]));

    if (query) {
        // Search mode
        const q = query.toLowerCase();
        displayTracks = allTracks.filter(t =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.performer && t.performer.toLowerCase().includes(q))
        );
    } else if (topicId) {
        // Playlist/topic mode
        displayTracks = allTracks.filter(t => t.topic_id === topicId);
    } else {
        // Home mode: show all
        displayTracks = allTracks;
    }

    // Prepare topics with track counts for homepage
    const topicsWithCount = allTopics.map(t => ({
        ...t,
        trackCount: allTracks.filter(tr => tr.topic_id === t.id).length
    })).filter(t => t.trackCount > 0);

    // Current topic info
    const currentTopicName = topicId ? (topicMap.get(topicId) || `Topic ${topicId}`) : null;

    return (
        <>
            {/* Hero / Search */}
            {!topicId && (
                <div className="hero-section">
                    <div className="hero-badge">
                        <span>🎶</span>
                        <span>Personal Music Stream</span>
                    </div>
                    <h1 className="hero-title">
                        Your Music, <span className="gradient-text">Your Way</span>
                    </h1>
                    <p className="hero-subtitle">
                        Stream your personal music collection directly from Telegram. Organized by playlists, play anywhere.
                    </p>
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                        <SearchInput initialQuery={query} />
                    </div>
                </div>
            )}

            {/* Playlist header when viewing a specific topic */}
            {topicId && currentTopicName && (
                <div className="playlist-header animate-fade-in">
                    <div className="playlist-header-cover">🎵</div>
                    <div className="playlist-header-info">
                        <div className="playlist-header-label">Playlist</div>
                        <h1 className="playlist-header-title">{currentTopicName}</h1>
                        <div className="playlist-header-meta">
                            <span>{displayTracks.length} tracks</span>
                            <span className="dot"></span>
                            <span>{formatTotalDuration(displayTracks)}</span>
                        </div>
                        <a href="/" className="playlist-play-btn" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                            ← Back to Library
                        </a>
                    </div>
                </div>
            )}

            {/* Search results header */}
            {query && (
                <div className="section-header animate-fade-in" style={{ paddingTop: 0 }}>
                    <h2 className="section-title">
                        <div className="section-title-icon"></div>
                        Results for &ldquo;{query}&rdquo;
                    </h2>
                    <a href="/" className="section-link">Clear search</a>
                </div>
            )}

            {/* Topics grid (homepage only) */}
            {!query && !topicId && topicsWithCount.length > 0 && (
                <div className="animate-fade-in-up" style={{ marginBottom: 40 }}>
                    <div className="section-header">
                        <h2 className="section-title">
                            <div className="section-title-icon"></div>
                            Playlists
                        </h2>
                    </div>
                    <TopicGrid topics={topicsWithCount} />
                </div>
            )}

            {/* Tracks */}
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                {!query && !topicId && (
                    <div className="section-header">
                        <h2 className="section-title">
                            <div className="section-title-icon"></div>
                            {allTracks.length > 0 ? 'All Tracks' : 'Getting Started'}
                        </h2>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {displayTracks.length} tracks
                        </span>
                    </div>
                )}

                {allTracks.length === 0 && !query && !topicId ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📡</div>
                        <div className="empty-state-title">No music yet</div>
                        <div className="empty-state-desc">
                            Run <code style={{
                                background: 'var(--bg-elevated)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 13
                            }}>node scripts/fetch-tracks.js</code> to scan your Telegram channel for music.
                        </div>
                    </div>
                ) : (
                    <TrackList tracks={displayTracks} />
                )}
            </div>
        </>
    );
}

function formatTotalDuration(tracks: Track[]): string {
    const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
}
