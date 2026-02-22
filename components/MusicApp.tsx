'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TrackList from '@/components/TrackList';
import SearchInput from '@/components/SearchInput';
import { Track } from '@/context/PlayerContext';
import { getAllTracks, getTracksInPlaylist, getPlaylists, DriveTrack, Playlist } from '@/lib/google-drive';

function driveTrackToTrack(t: DriveTrack): Track {
    return { ...t, topic_id: t.playlist_id } as unknown as Track;
}

function totalDur(tracks: Track[]) {
    const s = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    if (!s) return '';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

const GRADIENTS = [
    'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#ec4899,#be185d)',
    'linear-gradient(135deg,#0ea5e9,#0284c7)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f97316,#ea580c)',
    'linear-gradient(135deg,#a78bfa,#6d28d9)',
    'linear-gradient(135deg,#06b6d4,#0891b2)',
];
const EMOJIS = ['🎵', '🎸', '🎹', '🎧', '🎤', '🎺', '🎻', '🥁'];

// ── Sidebar Playlist Item ────────────────────────────────────
function PlaylistItem({
    id, name, trackCount, gradient, emoji, active, total, onClick
}: {
    id: string | number; name: string; trackCount?: number;
    gradient: string; emoji: string; active: boolean; total?: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            href={total ? '/' : `/?topic=${id}`}
            className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
            style={{ '--item-grad': gradient } as React.CSSProperties}
            onClick={onClick}
        >
            <div className="sidebar-item-icon" style={{ background: gradient }}>
                {emoji}
            </div>
            <div className="sidebar-item-info">
                <div className="sidebar-item-name">{name}</div>
                {trackCount !== undefined && (
                    <div className="sidebar-item-count">{trackCount} bài</div>
                )}
            </div>
            {active && <div className="sidebar-item-dot" />}
        </Link>
    );
}

// ── Main App ─────────────────────────────────────────────────
export default function MusicApp() {
    const searchParams = useSearchParams();
    const query = searchParams?.get('q') || '';
    const playlistId = searchParams?.get('topic') || null;

    const [allTracks, setAllTracks] = useState<Track[]>([]);
    const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close sidebar on navigation
    useEffect(() => { setSidebarOpen(false); }, [playlistId, query]);

    const loadData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            if (playlistId) {
                const [tracks, playlists] = await Promise.all([
                    getTracksInPlaylist(playlistId), getPlaylists(),
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

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = query
        ? allTracks.filter(t => {
            const q = query.toLowerCase();
            return (t.title?.toLowerCase().includes(q)) ||
                (t.performer?.toLowerCase().includes(q)) ||
                ((t as any).name?.toLowerCase().includes(q));
        })
        : allTracks;

    const topicsWithCount = allPlaylists
        .map(pl => ({
            id: pl.id, name: pl.name,
            trackCount: pl.trackCount ?? allTracks.filter(t => (t as any).playlist_id === pl.id).length,
        }))
        .filter(t => t.trackCount > 0);

    const currentPlaylist = playlistId ? allPlaylists.find(p => p.id === playlistId) : null;
    const totalTracks = allPlaylists.reduce((s, p) => s + (p.trackCount ?? 0), 0) || allTracks.length;

    return (
        <>
            {/* Mobile Library Toggle Button — in top-left of content area */}
            <div className="mobile-topbar">
                <button
                    className="mobile-lib-btn"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Mở Library"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <div className="mobile-topbar-logo">
                    <span className="logo-text" style={{ fontSize: '16px', fontWeight: '800' }}>BBM</span>
                </div>
                <div className="mobile-topbar-search">
                    <SearchInput initialQuery={query} compact />
                </div>
            </div>

            <div className="book-layout">
                {/* Backdrop mobile */}
                {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

                {/* ── Left Sidebar ── */}
                <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
                    <div className="sidebar-header">
                        <div className="sidebar-title-row">
                            <div className="sidebar-title-group">
                                <div className="sidebar-title">Library</div>
                                <div className="sidebar-sub">Your playlists</div>
                            </div>
                            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="sidebar-search">
                        <SearchInput initialQuery={query} compact />
                    </div>

                    <div className="sidebar-list">
                        <PlaylistItem
                            id="all" name="Tất cả" trackCount={totalTracks}
                            gradient={GRADIENTS[0]} emoji="🎶"
                            active={!playlistId && !query} total
                            onClick={() => setSidebarOpen(false)}
                        />
                        {loading && !allPlaylists.length && (
                            <div className="sidebar-loading">
                                <div className="sidebar-spin" />
                                <span>Đang tải...</span>
                            </div>
                        )}
                        {topicsWithCount.map((t, i) => (
                            <PlaylistItem
                                key={t.id} id={t.id} name={t.name} trackCount={t.trackCount}
                                gradient={GRADIENTS[(i + 1) % GRADIENTS.length]}
                                emoji={EMOJIS[i % EMOJIS.length]}
                                active={playlistId === String(t.id)}
                                total={false}
                                onClick={() => setSidebarOpen(false)}
                            />
                        ))}
                    </div>
                </aside>

                {/* ── Right Panel ── */}
                <main className="main-panel">
                    {/* Desktop only: floating lib button */}
                    {!sidebarOpen && (
                        <button className="panel-floating-lib-btn" onClick={() => setSidebarOpen(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                            <span>Mở Library</span>
                        </button>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="error-banner">
                            ⚠️ {error}
                            {error.includes('API_KEY') && (
                                <span> — Thêm <code>NEXT_PUBLIC_GOOGLE_API_KEY</code> vào GitHub Secrets</span>
                            )}
                        </div>
                    )}

                    {/* Panel Header */}
                    <div className="panel-header animate-fade-in">
                        {currentPlaylist ? (
                            <div className="panel-playlist-head">
                                <div
                                    className="panel-cover"
                                    style={{ background: GRADIENTS[topicsWithCount.findIndex(t => t.id === playlistId) % GRADIENTS.length + 1] || GRADIENTS[0] }}
                                >
                                    {EMOJIS[topicsWithCount.findIndex(t => t.id === playlistId) % EMOJIS.length]}
                                </div>
                                <div>
                                    <div className="panel-playlist-label">Playlist</div>
                                    <h1 className="panel-playlist-title">{currentPlaylist.name}</h1>
                                    <div className="panel-playlist-meta">
                                        <span>{filtered.length} bài</span>
                                        {totalDur(filtered) && <><span className="meta-dot" /><span>{totalDur(filtered)}</span></>}
                                    </div>
                                </div>
                            </div>
                        ) : query ? (
                            <div className="panel-title-row">
                                <h1 className="panel-title">Kết quả: &ldquo;{query}&rdquo;</h1>
                                <Link href="/" className="panel-clear-btn">✕ Xóa</Link>
                            </div>
                        ) : (
                            <div className="panel-title-row">
                                <h1 className="panel-title">All Tracks</h1>
                                <span className="panel-count">{filtered.length} bài</span>
                            </div>
                        )}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="panel-loading">
                            <div className="panel-spin" />
                            <span>Đang tải từ Google Drive…</span>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && !error && allTracks.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">📁</div>
                            <div className="empty-state-title">Chưa có nhạc</div>
                            <div className="empty-state-desc">Thêm <code>NEXT_PUBLIC_GOOGLE_API_KEY</code> vào GitHub Secrets và đảm bảo thư mục Drive được chia sẻ công khai.</div>
                        </div>
                    )}

                    {/* Track list */}
                    {!loading && <TrackList tracks={filtered} />}
                </main>
            </div>
        </>
    );
}
