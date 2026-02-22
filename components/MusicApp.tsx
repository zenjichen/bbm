'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TrackList from '@/components/TrackList';
import TopicGrid from '@/components/TopicGrid';
import SearchInput from '@/components/SearchInput';
import { Track } from '@/context/PlayerContext';
import { getAllTracks, getTracksInPlaylist, getPlaylists, DriveTrack, Playlist } from '@/lib/google-drive';

function driveTrackToTrack(t: DriveTrack): Track {
    return {
        ...t,
        topic_id: t.playlist_id,
    } as unknown as Track;
}

export default function MusicApp() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const playlistId = searchParams.get('topic') || null;

    const [allTracks, setAllTracks] = useState<Track[]>([]);
    const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (playlistId) {
                const [tracks, playlists] = await Promise.all([
                    getTracksInPlaylist(playlistId),
                    getPlaylists(),
                ]);
                setAllTracks(tracks.map(driveTrackToTrack));
                setAllPlaylists(playlists);
            } else {
                const { playlists, tracks } = await getAllTracks();
                setAllTracks(tracks.map(driveTrackToTrack));
                setAllPlaylists(playlists);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load from Google Drive');
        } finally {
            setLoading(false);
        }
    }, [playlistId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter by search query
    const filtered = query
        ? allTracks.filter(t => {
            const q = query.toLowerCase();
            return (
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.performer && t.performer.toLowerCase().includes(q)) ||
                ((t as any).name && (t as any).name.toLowerCase().includes(q))
            );
        })
        : allTracks;

    // Topics with track count for grid
    const topicsWithCount = allPlaylists
        .map(pl => ({
            id: pl.id,
            name: pl.name,
            trackCount: pl.trackCount ?? allTracks.filter(t => (t as any).playlist_id === pl.id).length,
        }))
        .filter(t => t.trackCount > 0);

    const currentPlaylist = playlistId ? allPlaylists.find(p => p.id === playlistId) : null;

    const totalDuration = (tracks: Track[]) => {
        const s = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
        if (s === 0) return '';
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };

    return (
        <>
            {/* Error banner */}
            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: 12,
                    padding: '12px 20px',
                    margin: '16px 0',
                    color: '#fca5a5',
                    fontSize: 14,
                }}>
                    ⚠️ {error}
                    {error.includes('API_KEY') && (
                        <span> — Thêm <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_API_KEY</code> vào GitHub Secrets</span>
                    )}
                </div>
            )}

            {/* Hero / Search */}
            {!playlistId && (
                <div className="hero-section">
                    <div className="hero-badge">
                        <span>🎶</span>
                        <span>Personal Music Stream</span>
                    </div>
                    <h1 className="hero-title">
                        Your Music, <span className="gradient-text">Your Way</span>
                    </h1>
                    <p className="hero-subtitle">
                        Stream your personal music collection directly from Google Drive. Organized by playlists, play anywhere.
                    </p>
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                        <SearchInput initialQuery={query} />
                    </div>
                </div>
            )}

            {/* Playlist header */}
            {playlistId && currentPlaylist && (
                <div className="playlist-header animate-fade-in">
                    <div className="playlist-header-cover">🎵</div>
                    <div className="playlist-header-info">
                        <div className="playlist-header-label">Playlist</div>
                        <h1 className="playlist-header-title">{currentPlaylist.name}</h1>
                        <div className="playlist-header-meta">
                            <span>{filtered.length} tracks</span>
                            {totalDuration(filtered) && <><span className="dot"></span><span>{totalDuration(filtered)}</span></>}
                        </div>
                        <a href={process.env.NEXT_PUBLIC_BASE_PATH || '/'} className="playlist-play-btn"
                            style={{ textDecoration: 'none', display: 'inline-flex' }}>
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
                    <a href={process.env.NEXT_PUBLIC_BASE_PATH || '/'} className="section-link">Clear search</a>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 16
                    }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: '3px solid var(--accent)',
                            borderTopColor: 'transparent',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading from Google Drive…</span>
                    </div>
                </div>
            )}

            {/* Playlists grid (homepage, not loading, no query) */}
            {!loading && !query && !playlistId && topicsWithCount.length > 0 && (
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
            {!loading && (
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    {!query && !playlistId && (
                        <div className="section-header">
                            <h2 className="section-title">
                                <div className="section-title-icon"></div>
                                {allTracks.length > 0 ? 'All Tracks' : 'Getting Started'}
                            </h2>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {filtered.length} tracks
                            </span>
                        </div>
                    )}

                    {!error && allTracks.length === 0 && !query && !playlistId ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📁</div>
                            <div className="empty-state-title">No music found</div>
                            <div className="empty-state-desc">
                                Thêm <code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>
                                    NEXT_PUBLIC_GOOGLE_API_KEY
                                </code> vào GitHub Secrets và đảm bảo thư mục Drive được chia sẻ công khai.
                            </div>
                        </div>
                    ) : (
                        <TrackList tracks={filtered} />
                    )}
                </div>
            )}
        </>
    );
}
