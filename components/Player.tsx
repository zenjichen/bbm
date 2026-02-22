"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

// ── Modern Minimal SVG Icons ──────────────────────────────────
const PlayIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 4.5V19.5L19 12L7 4.5Z" />
    </svg>
);

const PauseIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 5H10V19H6V5ZM14 5H18V19H14V5Z" />
    </svg>
);

const NextIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 4 10 8-10 8V4Z" /><path d="M19 5v14" />
    </svg>
);

const PrevIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 20-10-8 10-8v16Z" /><path d="M5 19V5" />
    </svg>
);

const ShuffleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.2 0 2.3.6 3 1.5l3.8 5c.2.3.4.5.7.7" /><path x="18" y="14" d="m18 14 4 4-4 4" /><path d="M15.3 16.5c.8 1 2 1.5 3.3 1.5H22" />
    </svg>
);

const RepeatIcon = ({ one }: { one?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m17 2 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        {one && <text x="9" y="15" fontSize="10" fontWeight="bold" fill="currentColor">1</text>}
    </svg>
);

const VolHigh = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const VolLow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const VolOff = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
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

    return (
        <div className="player-container">
            <div className="player-bar">
                <ProgressBar progress={progress} seekTo={seekTo} currentTime={currentTime} totalDuration={totalDuration} />

                <div className="player-inner">
                    {/* Left: Info */}
                    <div className="player-left">
                        <div className={`player-cover ${isPlaying ? 'cover-active' : ''}`}>
                            {currentTrack && !imgError && thumbUrl ? (
                                <img src={thumbUrl} alt="" onError={() => setImgError(true)}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: 24 }}>🎵</span>
                            )}
                        </div>
                        <div className="player-text-premium" onClick={scrollToCurrent}>
                            <div className="player-title-full">{currentTrack?.title || "Sẵn sàng phát nhạc"}</div>
                            <div className="player-artist-premium">{currentTrack?.performer || "Chọn một bài hát để bắt đầu"}</div>
                        </div>
                    </div>

                    {/* Center: Controls */}
                    <div className="player-center">
                        <div className="player-buttons-modern">
                            <button className={`pl-btn-modern btn-shuffle ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle"><ShuffleIcon /></button>
                            <button className="pl-btn-modern btn-prev" onClick={prevTrack} title="Prev"><PrevIcon /></button>
                            <button className="pl-play-modern" onClick={togglePlay}>
                                {isLoading ? <div className="spin-ring" /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </button>
                            <button className="pl-btn-modern btn-next" onClick={nextTrack} title="Next"><NextIcon /></button>
                            <button className={`pl-btn-modern btn-repeat ${repeatMode !== 'off' ? 'active' : ''}`} onClick={toggleRepeat} title="Repeat">
                                <RepeatIcon one={repeatMode === 'one'} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Volume */}
                    <div className="player-right">
                        <div className="vol-wrap-aesthetic" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button className="pl-btn-modern" onClick={toggleMute}>
                                {volume === 0 ? <VolOff /> : volume < 50 ? <VolLow /> : <VolHigh />}
                            </button>
                            <input type="range" min="0" max="100" value={volume}
                                onChange={e => setVolume(+e.target.value)}
                                style={{
                                    width: '80px',
                                    accentColor: 'var(--accent)',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
