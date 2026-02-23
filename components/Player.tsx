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
    const fillRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const tipRef = useRef<HTMLDivElement>(null);
    const timesCurrentRef = useRef<HTMLSpanElement>(null);

    const dragging = useRef(false);
    const rafId = useRef<number>(0);
    const dragPct = useRef(progress);

    // Tính % từ clientX
    const getPct = (cx: number) => {
        const r = barRef.current?.getBoundingClientRect();
        if (!r) return 0;
        return Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100));
    };

    // Cập nhật DOM trực tiếp (KHÔNG re-render React) — zero lag
    const applyPct = useCallback((p: number) => {
        if (fillRef.current) fillRef.current.style.width = `${p}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${p}%`;
        if (tipRef.current) {
            tipRef.current.style.left = `${p}%`;
            tipRef.current.textContent = fmt((p / 100) * totalDuration);
            tipRef.current.style.opacity = '1';
        }
        if (timesCurrentRef.current) {
            timesCurrentRef.current.textContent = fmt((p / 100) * totalDuration);
        }
    }, [totalDuration]);

    // ── Mouse events ──────────────────────────────────────────────
    const [active, setActive] = useState(false);

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        setActive(true);
        dragPct.current = getPct(e.clientX);
        applyPct(dragPct.current);
    };
    const onMouseMove = (e: React.MouseEvent) => {
        const p = getPct(e.clientX);
        if (tipRef.current) {
            tipRef.current.style.left = `${p}%`;
            tipRef.current.textContent = fmt((p / 100) * totalDuration);
            tipRef.current.style.opacity = '1';
        }
        if (dragging.current) {
            dragPct.current = p;
            applyPct(p);
        }
    };
    const onMouseUp = (e: React.MouseEvent) => {
        if (dragging.current) {
            seekTo(getPct(e.clientX));
            dragging.current = false;
            setActive(false);
        }
    };
    const onMouseLeave = () => {
        if (tipRef.current) tipRef.current.style.opacity = '0';
    };

    // ── Touch events — native listeners để dùng passive:false ────
    useEffect(() => {
        const el = barRef.current;
        if (!el) return;

        const onTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            dragging.current = true;
            setActive(true);
            dragPct.current = getPct(e.touches[0].clientX);
            applyPct(dragPct.current);
            // Hiện thumb ngay lập tức
            if (thumbRef.current) thumbRef.current.style.opacity = '1';
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!dragging.current) return;
            e.preventDefault();
            const p = getPct(e.touches[0].clientX);
            dragPct.current = p;
            cancelAnimationFrame(rafId.current);
            rafId.current = requestAnimationFrame(() => applyPct(p));
        };

        const onTouchEnd = () => {
            if (!dragging.current) return;
            dragging.current = false;
            setActive(false);
            if (thumbRef.current) thumbRef.current.style.opacity = '';
            if (tipRef.current) tipRef.current.style.opacity = '0';
            // Seek thật sự chỉ khi nhả tay
            seekTo(dragPct.current);
        };

        // passive: false để e.preventDefault() hoạt động (ngăn page scroll)
        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        el.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
            cancelAnimationFrame(rafId.current);
        };
    }, [applyPct, seekTo]);

    // ── Global mouse up (khi kéo ra ngoài bar) ───────────────────
    useEffect(() => {
        const onUp = (e: MouseEvent) => {
            if (dragging.current) {
                seekTo(getPct(e.clientX));
                dragging.current = false;
                setActive(false);
            }
        };
        const onMove = (e: MouseEvent) => {
            if (dragging.current) {
                dragPct.current = getPct(e.clientX);
                applyPct(dragPct.current);
            }
        };
        window.addEventListener('mouseup', onUp);
        window.addEventListener('mousemove', onMove);
        return () => {
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mousemove', onMove);
        };
    }, [applyPct, seekTo]);

    return (
        <div className="pb-wrap">
            {/* Hit area lớn hơn để dễ chạm trên mobile */}
            <div
                ref={barRef}
                className={`pb-track ${active ? 'pb-active' : ''}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                style={{ touchAction: 'none' }}
            >
                <div ref={fillRef} className="pb-fill" style={{ width: `${progress}%` }}>
                    <div className="pb-glow" />
                </div>
                <div ref={thumbRef} className="pb-thumb" style={{ left: `${progress}%` }} />
                <div ref={tipRef} className="pb-tip" style={{ opacity: 0, left: `${progress}%` }}>
                    {fmt((progress / 100) * totalDuration)}
                </div>
            </div>
            <div className="pb-times">
                <span ref={timesCurrentRef}>{fmt(currentTime)}</span>
                <span>{fmt(totalDuration)}</span>
            </div>
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
                            <div className="player-artist-premium">{currentTrack ? (currentTrack.performer || "") : "Chọn một bài hát để bắt đầu"}</div>
                        </div>
                    </div>

                    {/* Center: Controls (desktop: full row. mobile: only play btn) */}
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

                {/* Mobile-only: bottom controls row (Shuffle/Prev/Next/Repeat) */}
                <div className="player-controls-bottom">
                    <button className={`pl-btn-modern btn-shuffle ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle"><ShuffleIcon /></button>
                    <button className="pl-btn-modern btn-prev" onClick={prevTrack} title="Prev"><PrevIcon /></button>
                    <button className="pl-btn-modern btn-next" onClick={nextTrack} title="Next"><NextIcon /></button>
                    <button className={`pl-btn-modern btn-repeat ${repeatMode !== 'off' ? 'active' : ''}`} onClick={toggleRepeat} title="Repeat">
                        <RepeatIcon one={repeatMode === 'one'} />
                    </button>
                </div>
            </div>
        </div>
    );
}
