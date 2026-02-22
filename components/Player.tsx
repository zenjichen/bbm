"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

// ── Modern Minimalist Icons ─────────────────────────────────────────
const PlayIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 6v12l10-6z" />
    </svg>
);
const PauseIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);
const NextIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
);
const PrevIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
);
const ShuffleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
);
const RepeatIcon = ({ one }: { one?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
        {one && <text x="9" y="15" fontSize="8" fill="currentColor" stroke="none" fontWeight="900">1</text>}
    </svg>
);

// Aesthetic Volume Icons
const VolOff = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
    </svg>
);
const VolLow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07" />
    </svg>
);
const VolHigh = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
    </svg>
);

function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function trackThumb(fileId: string): string {
    const seed = (fileId || 'bbmmusic').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'bbmdefault';
    return `https://picsum.photos/seed/${seed}/400/400`;
}

// ── Drag Progress Bar ──────────────────────────────────────────
function ProgressBar({ progress, seekTo, currentTime, totalDuration }: {
    progress: number; seekTo: (p: number) => void;
    currentTime: number; totalDuration: number;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const [active, setActive] = useState(false);
    const [tip, setTip] = useState<{ x: number; time: string } | null>(null);

    const pct = (cx: number) => {
        const r = barRef.current?.getBoundingClientRect();
        if (!r) return 0;
        return Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100));
    };

    const onDown = (e: React.MouseEvent) => { dragging.current = true; setActive(true); seekTo(pct(e.clientX)); };
    const onMove = (e: React.MouseEvent) => {
        const p = pct(e.clientX);
        setTip({ x: p, time: fmt((p / 100) * totalDuration) });
        if (dragging.current) seekTo(p);
    };
    const onUp = (e: React.MouseEvent) => { if (dragging.current) { seekTo(pct(e.clientX)); dragging.current = false; setActive(false); } };
    const onLeave = () => setTip(null);
    const onTouch = (e: React.TouchEvent) => { dragging.current = true; seekTo(pct(e.touches[0].clientX)); };
    const onTouchMove = (e: React.TouchEvent) => { if (dragging.current) { e.preventDefault(); seekTo(pct(e.touches[0].clientX)); } };
    const onTouchEnd = () => { dragging.current = false; setActive(false); };

    useEffect(() => {
        const up = () => { dragging.current = false; setActive(false); };
        const mv = (e: MouseEvent) => { if (dragging.current) seekTo(pct(e.clientX)); };
        window.addEventListener('mouseup', up);
        window.addEventListener('mousemove', mv);
        return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', mv); };
    }, [seekTo]);

    return (
        <div className="pb-wrap">
            <div
                ref={barRef}
                className={`pb-track ${active ? 'pb-active' : ''}`}
                onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
                onMouseLeave={onLeave} onTouchStart={onTouch}
                onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            >
                <div className="pb-fill" style={{ width: `${progress}%` }}>
                    <div className="pb-glow" />
                </div>
                <div className="pb-thumb" style={{ left: `${progress}%` }} />
                {tip && <div className="pb-tip" style={{ left: `${tip.x}%` }}>{tip.time}</div>}
            </div>
            <div className="pb-times"><span>{fmt(currentTime)}</span><span>{fmt(totalDuration)}</span></div>
        </div>
    );
}

// ── Main Player ────────────────────────────────────────────────
export default function Player() {
    const {
        currentTrack, isPlaying, isLoading, togglePlay,
        nextTrack, prevTrack, progress, currentTime, totalDuration,
        volume, isShuffle, repeatMode,
        seekTo, setVolume, toggleShuffle, toggleRepeat
    } = usePlayer();

    const prevVol = useRef(volume);
    const toggleMute = useCallback(() => {
        if (volume > 0) { prevVol.current = volume; setVolume(0); }
        else setVolume(prevVol.current || 75);
    }, [volume, setVolume]);

    const scrollToCurrent = () => {
        const activeItem = document.querySelector('.track-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a brief animation to the item
            activeItem.classList.add('scroll-highlight');
            setTimeout(() => activeItem.classList.remove('scroll-highlight'), 1000);
        }
    };

    const [imgError, setImgError] = useState(false);
    const thumbUrl = currentTrack ? trackThumb(currentTrack.file_id) : '';
    useEffect(() => { setImgError(false); }, [currentTrack?.file_id]);

    if (!currentTrack) return null;

    return (
        <div className="player-bar">
            <div className="player-dynamic-bg" style={{
                backgroundImage: isPlaying ? `url(${thumbUrl})` : 'none'
            }} />

            <ProgressBar progress={progress} seekTo={seekTo} currentTime={currentTime} totalDuration={totalDuration} />

            <div className="player-inner">
                {/* Left: Info */}
                <div className="player-left">
                    <div className={`player-cover ${isPlaying ? 'cover-active' : ''}`}>
                        {!imgError ? (
                            <img src={thumbUrl} alt="" onError={() => setImgError(true)}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        ) : <span style={{ fontSize: 28 }}>🎵</span>}
                    </div>
                    <div className="player-text-premium" onClick={scrollToCurrent} title="Bấm để xem bài hát đang phát">
                        <div className="player-title-full">{currentTrack.title || "Unknown"}</div>
                        <div className="player-artist-premium">{currentTrack.performer || "Unknown Artist"}</div>
                    </div>
                </div>

                {/* Center: Controls */}
                <div className="player-center">
                    <div className="player-buttons-premium">
                        <button className={`pl-btn-framed ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle"><ShuffleIcon /></button>
                        <button className="pl-btn-framed" onClick={prevTrack} title="Prev"><PrevIcon /></button>
                        <button className="pl-play-main-premium" onClick={togglePlay}>
                            {isLoading ? <div className="spin-ring" /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button className="pl-btn-framed" onClick={nextTrack} title="Next"><NextIcon /></button>
                        <button className={`pl-btn-framed ${repeatMode !== 'off' ? 'active' : ''}`} onClick={toggleRepeat}>
                            <RepeatIcon one={repeatMode === 'one'} />
                        </button>
                    </div>
                </div>

                {/* Right: Volume */}
                <div className="player-right">
                    <div className="vol-wrap-aesthetic">
                        <button className="vol-btn-aesthetic" onClick={toggleMute}>
                            {volume === 0 ? <VolOff /> : volume < 50 ? <VolLow /> : <VolHigh />}
                        </button>
                        <input type="range" min="0" max="100" value={volume}
                            onChange={e => setVolume(+e.target.value)} className="vol-slider-aesthetic" />
                    </div>
                </div>
            </div>
        </div>
    );
}
