"use client";

import React from "react";
import { Track, usePlayer } from "@/context/PlayerContext";

// Inline SVG icons
const PlayIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const PauseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

function formatDuration(seconds?: number): string {
    if (!seconds || isNaN(seconds)) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

function trackThumb(fileId: string): string {
    const seed = (fileId || 'bbm').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'music';
    return `https://picsum.photos/seed/${seed}/80/80`;
}

function TrackItem({ track, index, playlistContext }: {
    track: Track;
    index: number;
    playlistContext: Track[];
}) {
    const { playTrack, currentTrack, isPlaying, setPlaylist, togglePlay } = usePlayer();
    const isCurrent = currentTrack?.id === track.id;
    const [imgErr, setImgErr] = React.useState(false);

    const handleClick = () => {
        if (isCurrent) { togglePlay(); }
        else { setPlaylist(playlistContext); playTrack(track); }
    };

    return (
        <div
            onClick={handleClick}
            className={`track-item ${isCurrent ? 'active' : ''}`}
            id={`track-${track.id}`}
        >
            <div className="track-number">
                {isCurrent && isPlaying ? (
                    <div className="now-playing-bars">
                        <span /><span /><span /><span />
                    </div>
                ) : index + 1}
            </div>

            <div className="track-cover">
                {!imgErr ? (
                    <img
                        src={trackThumb(track.file_id)}
                        alt=""
                        onError={() => setImgErr(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ fontSize: 16 }}>🎵</span>
                )}
            </div>

            <div className="track-info">
                <div className="track-title">{track.title || "Untitled"}</div>
                <div className="track-artist">{track.performer || "Unknown Artist"}</div>
            </div>

            <div className="track-duration">{formatDuration(track.duration)}</div>
        </div>
    );
}

export default function TrackList({ tracks }: { tracks: Track[] }) {
    if (tracks.length === 0) return null;

    return (
        <div className="track-list-container">
            <div className="track-table-header">
                <div style={{ width: 32 }}>#</div>
                <div style={{ flex: 1, paddingLeft: 56 }}>TIÊU ĐỀ</div>
                <div style={{ width: 60, textAlign: 'right' }}>THỜI LƯỢNG</div>
            </div>

            <div className="track-list">
                {tracks.map((track, i) => (
                    <TrackItem
                        key={track.id}
                        track={track}
                        index={i}
                        playlistContext={tracks}
                    />
                ))}
            </div>
        </div>
    );
}
