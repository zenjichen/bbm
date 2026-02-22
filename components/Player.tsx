"use client";

import React, { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";

// ── Icons ─────────────────────────────────────────────────────────
const PlayIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const NextIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>;
const PrevIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>;
const ShuffleIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>;
const RepeatIcon = ({ one }: { one?: boolean }) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />{one && <text x="10" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">1</text>}</svg>;
const VolOff = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
const VolOn = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;

function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function trackThumb(fileId: string): string {
    const seed = (fileId || 'bbmmusic').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'bbmdefault';
    return `https://picsum.photos/seed/${seed}/200/200`;
}

// ── CSS Waveform (no Web Audio API needed — compatible with Google Drive CORS) ──
// Note: Web Audio API requires crossOrigin='anonymous' which breaks Google Drive streams.
// CSS animation gives beautiful visual without any CORS requirements.
function CSSWaveform({ isPlaying }: { isPlaying: boolean }) {
    const bars = useMemo(() => Array.from({ length: 48 }, (_, i) => {
        const x = i / 48;
        const h = Math.max(0.1,
            Math.exp(-Math.pow((x - 0.3) * 3, 2)) * 0.7 +
            Math.exp(-Math.pow((x - 0.7) * 4, 2)) * 0.5 +
            Math.sin(i * 2.1) * 0.15 + Math.cos(i * 3.7) * 0.1
        );
        return {
            h: Math.max(4, Math.min(34, h * 36)),
            delay: (i * 43 + i * i * 7) % 900,
            dur: 380 + (i * 97) % 400,
        };
    }), []);

    return (
        <div className={`css-waveform ${isPlaying ? 'wf-playing' : ''}`}>
            {bars.map((b, i) => (
                <div key={i} className="wf-bar" style={{
                    '--bar-h': `${b.h}px`,
                    '--delay': `${b.delay}ms`,
                    '--dur': `${b.dur}ms`,
                } as React.CSSProperties} />
            ))}
        </div>
    );
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

// ── Speed Control ──────────────────────────────────────────────
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

function SpeedControl({ speed, setSpeed }: { speed: number; setSpeed: (s: any) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="speed-ctrl" onMouseLeave={() => setOpen(false)}>
            <button className={`spd-btn ${speed !== 1 ? 'spd-active' : ''}`} onClick={() => setOpen(o => !o)}>
                {speed === 1 ? '1×' : `${speed}×`}
            </button>
            {open && (
                <div className="spd-menu">
                    <div className="spd-label">Tốc độ</div>
                    {SPEEDS.map(s => (
                        <button key={s} className={`spd-opt ${speed === s ? 'spd-opt-active' : ''}`}
                            onClick={() => { setSpeed(s); setOpen(false); }}>
                            <span className="spd-dot" />{s === 1 ? 'Bình thường' : `${s}×`}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Player ────────────────────────────────────────────────
export default function Player() {
    const {
        currentTrack, isPlaying, isLoading, togglePlay,
        nextTrack, prevTrack, progress, currentTime, totalDuration,
        volume, isShuffle, repeatMode, playbackSpeed,
        seekTo, setVolume, toggleShuffle, toggleRepeat, setPlaybackSpeed,
    } = usePlayer();

    const prevVol = useRef(volume);
    const toggleMute = useCallback(() => {
        if (volume > 0) { prevVol.current = volume; setVolume(0); }
        else setVolume(prevVol.current || 75);
    }, [volume, setVolume]);

    const [imgError, setImgError] = useState(false);
    const thumbUrl = currentTrack ? trackThumb(currentTrack.file_id) : '';
    useEffect(() => { setImgError(false); }, [currentTrack?.file_id]);

    if (!currentTrack) return null;

    return (
        <div className="player-bar">
            <ProgressBar progress={progress} seekTo={seekTo} currentTime={currentTime} totalDuration={totalDuration} />

            <div className="player-inner">
                {/* Left: cover + info */}
                <div className="player-left">
                    <div className={`player-cover ${isPlaying ? 'cover-active' : ''}`}>
                        {!imgError ? (
                            <img src={thumbUrl} alt="" onError={() => setImgError(true)}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        ) : <span style={{ fontSize: 22 }}>🎵</span>}
                    </div>
                    <div className="player-text">
                        <div className="player-title">{currentTrack.title || "Unknown"}</div>
                        <div className="player-artist">{currentTrack.performer || "Unknown Artist"}</div>
                    </div>
                </div>

                {/* Center: waveform + controls */}
                <div className="player-center">
                    <CSSWaveform isPlaying={isPlaying} />
                    <div className="player-buttons">
                        <button className={`pl-btn ${isShuffle ? 'pl-btn-on' : ''}`} onClick={toggleShuffle} title="Shuffle"><ShuffleIcon /></button>
                        <button className="pl-btn" onClick={prevTrack} title="Prev"><PrevIcon /></button>
                        <button className="pl-btn pl-play" onClick={togglePlay}>
                            {isLoading ? <div className="spin-ring" /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button className="pl-btn" onClick={nextTrack} title="Next"><NextIcon /></button>
                        <button className={`pl-btn ${repeatMode !== 'off' ? 'pl-btn-on' : ''}`} onClick={toggleRepeat}>
                            <RepeatIcon one={repeatMode === 'one'} />
                        </button>
                    </div>
                </div>

                {/* Right: speed + volume */}
                <div className="player-right">
                    <SpeedControl speed={playbackSpeed} setSpeed={setPlaybackSpeed} />
                    <div className="vol-wrap">
                        <button className="pl-btn" onClick={toggleMute}>
                            {volume === 0 ? <VolOff /> : <VolOn />}
                        </button>
                        <input type="range" min="0" max="100" value={volume}
                            onChange={e => setVolume(+e.target.value)} className="vol-slider" />
                    </div>
                </div>
            </div>
        </div>
    );
}
