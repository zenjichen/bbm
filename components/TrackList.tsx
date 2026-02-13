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

function TrackItem({ track, index, playlistContext }: {
    track: Track;
    index: number;
    playlistContext: Track[];
}) {
    const { playTrack, currentTrack, isPlaying, setPlaylist, togglePlay } = usePlayer();
    const isCurrent = currentTrack?.id === track.id;

    const handleClick = () => {
        if (isCurrent) {
            togglePlay();
        } else {
            setPlaylist(playlistContext);
            playTrack(track);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`track-item ${isCurrent ? 'active' : ''}`}
            id={`track-${track.id}`}
        >
            {/* Track number / play icon */}
            <span className="track-number">{index + 1}</span>
            <span className="track-play-icon" style={{ color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {isCurrent && isPlaying ? <PauseIcon /> : <PlayIcon />}
            </span>

            {/* Cover */}
            <div className="track-cover">
                {isCurrent && isPlaying ? (
                    <div className="now-playing-bars">
                        <span></span><span></span><span></span><span></span>
                    </div>
                ) : (
                    <span style={{ fontSize: 16 }}>🎵</span>
                )}
            </div>

            {/* Info */}
            <div className="track-info">
                <div className="track-title">{track.title || "Untitled"}</div>
                <div className="track-artist">{track.performer || "Unknown Artist"}</div>
            </div>

            {/* Duration */}
            <div className="track-duration">{formatDuration(track.duration)}</div>
        </div>
    );
}

export default function TrackList({ tracks }: { tracks: Track[] }) {
    if (tracks.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🎶</div>
                <div className="empty-state-title">No tracks found</div>
                <div className="empty-state-desc">
                    Try a different search or run the fetch script to scan your Telegram channel.
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Table header */}
            <div className="track-table-header">
                <span style={{ width: 24, textAlign: 'center' }}>#</span>
                <span style={{ width: 44 }}></span>
                <span style={{ flex: 1 }}>Title</span>
                <span>Duration</span>
            </div>

            {/* Track list */}
            <div className="track-list stagger-enter">
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
