"use client";

import React, { useRef, useCallback } from "react";
import { usePlayer } from "@/context/PlayerContext";

// SVG Icons inline to avoid dependency issues
const PlayIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const PauseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

const SkipNextIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
);

const SkipPrevIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
);

const ShuffleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
);

const RepeatIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
);

const RepeatOneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        <text x="11" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">1</text>
    </svg>
);

const VolumeIcon = ({ muted }: { muted: boolean }) => (
    muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
    )
);

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

export default function Player() {
    const {
        currentTrack, isPlaying, isLoading, togglePlay,
        nextTrack, prevTrack, progress, currentTime, totalDuration,
        volume, isShuffle, repeatMode,
        seekTo, setVolume, toggleShuffle, toggleRepeat
    } = usePlayer();

    const progressRef = useRef<HTMLDivElement>(null);
    const prevVolume = useRef(volume);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const bar = progressRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        seekTo(Math.max(0, Math.min(100, percent)));
    }, [seekTo]);

    const handleVolumeToggle = useCallback(() => {
        if (volume > 0) {
            prevVolume.current = volume;
            setVolume(0);
        } else {
            setVolume(prevVolume.current || 80);
        }
    }, [volume, setVolume]);

    if (!currentTrack) return null;

    return (
        <div className="player-bar animate-slide-up">
            {/* Progress bar */}
            <div
                ref={progressRef}
                className="player-progress-bar"
                onClick={handleProgressClick}
            >
                <div
                    className="player-progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="player-inner">
                {/* Track Info */}
                <div className="player-track-info">
                    <div className={`player-cover ${isPlaying ? 'playing' : ''}`}>
                        🎵
                    </div>
                    <div className="player-text">
                        <div className="player-title">{currentTrack.title || "Unknown"}</div>
                        <div className="player-artist">{currentTrack.performer || "Unknown Artist"}</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="player-controls">
                    <div className="player-buttons">
                        <button
                            className={`player-btn ${isShuffle ? 'active' : ''}`}
                            onClick={toggleShuffle}
                            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
                        >
                            <ShuffleIcon />
                        </button>

                        <button className="player-btn" onClick={prevTrack} title="Previous">
                            <SkipPrevIcon />
                        </button>

                        <button
                            className="player-btn player-btn-play"
                            onClick={togglePlay}
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isLoading ? (
                                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                            ) : isPlaying ? (
                                <PauseIcon />
                            ) : (
                                <PlayIcon />
                            )}
                        </button>

                        <button className="player-btn" onClick={nextTrack} title="Next">
                            <SkipNextIcon />
                        </button>

                        <button
                            className={`player-btn ${repeatMode !== 'off' ? 'active' : ''}`}
                            onClick={toggleRepeat}
                            title={`Repeat: ${repeatMode}`}
                        >
                            {repeatMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
                        </button>
                    </div>

                    <div className="player-time">
                        <span>{formatTime(currentTime)}</span>
                        <div className="player-time-slider" onClick={handleProgressClick}>
                            <div className="player-progress-fill" style={{ width: `${progress}%`, height: '100%', borderRadius: 2 }} />
                        </div>
                        <span>{formatTime(totalDuration)}</span>
                    </div>
                </div>

                {/* Extras: Volume */}
                <div className="player-extras">
                    <div className="volume-control">
                        <button className="player-btn" onClick={handleVolumeToggle}>
                            <VolumeIcon muted={volume === 0} />
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(parseInt(e.target.value))}
                            className="volume-slider"
                            title={`Volume: ${volume}%`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
