"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

// ── Icons ──────────────────────────────────────────────
const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);
const SkipNextIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
);
const SkipPrevIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
);
const ShuffleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
    </svg>
);
const RepeatIcon = ({ one }: { one?: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        {one && <text x="10" y="14.5" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">1</text>}
    </svg>
);
const VolumeOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
);
const VolumeOnIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

function formatTime(s: number) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" + sec : sec}`;
}

// ── Waveform Visualizer ─────────────────────────────────
function Waveform({ audioRef, isPlaying }: {
    audioRef: React.MutableRefObject<HTMLAudioElement | null>;
    isPlaying: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const ctxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setup = () => {
            if (ctxRef.current) return; // already set up
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.82;
            const source = ctx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            ctxRef.current = ctx;
            analyserRef.current = analyser;
            sourceRef.current = source;
        };

        audio.addEventListener('play', setup);
        return () => audio.removeEventListener('play', setup);
    }, [audioRef]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas) return;

        const draw = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const W = canvas.width, H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            if (!analyser || !isPlaying) {
                // Static bars when not playing
                const bars = 40;
                const barW = (W / bars) * 0.6;
                const gap = (W / bars) * 0.4;
                for (let i = 0; i < bars; i++) {
                    const h = 4 + Math.sin(i * 0.5) * 3;
                    const x = i * (barW + gap);
                    const gradient = ctx.createLinearGradient(0, H, 0, 0);
                    gradient.addColorStop(0, 'rgba(99,102,241,0.6)');
                    gradient.addColorStop(1, 'rgba(167,139,250,0.3)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.roundRect(x, H / 2 - h / 2, barW, h, 2);
                    ctx.fill();
                }
                return;
            }

            const bufferLen = analyser.frequencyBinCount;
            const data = new Uint8Array(bufferLen);
            analyser.getByteFrequencyData(data);

            const bars = Math.min(60, bufferLen);
            const barW = (W / bars) * 0.55;
            const gap = (W / bars) * 0.45;

            for (let i = 0; i < bars; i++) {
                const value = data[Math.floor(i * bufferLen / bars)] / 255;
                const h = Math.max(4, value * H * 0.9);
                const x = i * (barW + gap);
                const y = (H - h) / 2;

                const gradient = ctx.createLinearGradient(0, H, 0, 0);
                gradient.addColorStop(0, `rgba(99,102,241,${0.4 + value * 0.6})`);
                gradient.addColorStop(0.5, `rgba(139,92,246,${0.5 + value * 0.5})`);
                gradient.addColorStop(1, `rgba(167,139,250,${0.3 + value * 0.7})`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, y, barW, h, 3);
                ctx.fill();
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        if (isPlaying) {
            animFrameRef.current = requestAnimationFrame(draw);
        } else {
            cancelAnimationFrame(animFrameRef.current);
            draw(); // draw static
        }

        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isPlaying, analyserRef.current]);

    return (
        <canvas
            ref={canvasRef}
            width={240}
            height={40}
            style={{ display: 'block', width: 240, height: 40 }}
        />
    );
}

// ── Progress Bar (drag support) ─────────────────────────────────
function ProgressBar({ progress, seekTo, currentTime, totalDuration }: {
    progress: number;
    seekTo: (p: number) => void;
    currentTime: number;
    totalDuration: number;
}) {
    const barRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const [hoverPercent, setHoverPercent] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);

    const getPercent = (clientX: number) => {
        const bar = barRef.current;
        if (!bar) return 0;
        const rect = bar.getBoundingClientRect();
        return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    };

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        setDragging(true);
        seekTo(getPercent(e.clientX));
    };
    const onMouseMove = (e: React.MouseEvent) => {
        setHoverPercent(getPercent(e.clientX));
        if (isDragging.current) seekTo(getPercent(e.clientX));
    };
    const onMouseUp = (e: React.MouseEvent) => {
        if (isDragging.current) { seekTo(getPercent(e.clientX)); isDragging.current = false; setDragging(false); }
    };
    const onTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        seekTo(getPercent(e.touches[0].clientX));
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (isDragging.current) seekTo(getPercent(e.touches[0].clientX));
    };
    const onTouchEnd = () => { isDragging.current = false; };

    useEffect(() => {
        const up = () => { isDragging.current = false; setDragging(false); };
        const move = (e: MouseEvent) => { if (isDragging.current) seekTo(getPercent(e.clientX)); };
        window.addEventListener('mouseup', up);
        window.addEventListener('mousemove', move);
        return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', move); };
    }, [seekTo]);

    const displayProgress = dragging ? progress : progress;
    const tooltip = hoverPercent !== null ? formatTime((hoverPercent / 100) * totalDuration) : null;

    return (
        <div className="pb-wrap">
            <div
                ref={barRef}
                className={`pb-track ${dragging ? 'pb-dragging' : ''}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseLeave={() => setHoverPercent(null)}
                onMouseUp={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Buffered background */}
                <div className="pb-fill" style={{ width: `${displayProgress}%` }}>
                    <div className="pb-thumb" />
                </div>
                {/* Hover tooltip */}
                {tooltip && hoverPercent !== null && (
                    <div className="pb-tooltip" style={{ left: `${hoverPercent}%` }}>{tooltip}</div>
                )}
            </div>
            <div className="pb-times">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalDuration)}</span>
            </div>
        </div>
    );
}

// ── Speed Selector ──────────────────────────────────────
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

function SpeedControl({ speed, setSpeed }: {
    speed: number;
    setSpeed: (s: any) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="speed-control" onMouseLeave={() => setOpen(false)}>
            <button
                className={`player-btn speed-btn ${speed !== 1 ? 'active' : ''}`}
                onClick={() => setOpen(o => !o)}
                title="Playback speed"
            >
                {speed === 1 ? '1×' : `${speed}×`}
            </button>
            {open && (
                <div className="speed-menu">
                    {SPEEDS.map(s => (
                        <button
                            key={s}
                            className={`speed-option ${speed === s ? 'active' : ''}`}
                            onClick={() => { setSpeed(s); setOpen(false); }}
                        >
                            {s === 1 ? 'Normal' : `${s}×`}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Player ──────────────────────────────────────────
export default function Player() {
    const {
        currentTrack, isPlaying, isLoading, togglePlay,
        nextTrack, prevTrack, progress, currentTime, totalDuration,
        volume, isShuffle, repeatMode, playbackSpeed, audioRef,
        seekTo, setVolume, toggleShuffle, toggleRepeat, setPlaybackSpeed,
    } = usePlayer();

    const prevVolume = useRef(volume);

    const handleVolumeToggle = useCallback(() => {
        if (volume > 0) { prevVolume.current = volume; setVolume(0); }
        else { setVolume(prevVolume.current || 80); }
    }, [volume, setVolume]);

    if (!currentTrack) return null;

    return (
        <div className="player-bar animate-slide-up">
            {/* Top progress bar (thin, full width) */}
            <div className="player-progress-outer">
                <ProgressBar
                    progress={progress}
                    seekTo={seekTo}
                    currentTime={currentTime}
                    totalDuration={totalDuration}
                />
            </div>

            <div className="player-inner">
                {/* Track Info */}
                <div className="player-track-info">
                    <div className={`player-cover ${isPlaying ? 'playing' : ''}`}>🎵</div>
                    <div className="player-text">
                        <div className="player-title">{currentTrack.title || "Unknown"}</div>
                        <div className="player-artist">{currentTrack.performer || "Unknown Artist"}</div>
                    </div>
                </div>

                {/* Center: Waveform + Controls */}
                <div className="player-center">
                    {/* Waveform */}
                    <div className="waveform-wrap">
                        <Waveform audioRef={audioRef} isPlaying={isPlaying} />
                    </div>

                    {/* Control buttons */}
                    <div className="player-buttons">
                        <button className={`player-btn ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle} title="Shuffle">
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
                            {isLoading
                                ? <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                                : isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <button className="player-btn" onClick={nextTrack} title="Next">
                            <SkipNextIcon />
                        </button>
                        <button
                            className={`player-btn ${repeatMode !== 'off' ? 'active' : ''}`}
                            onClick={toggleRepeat}
                            title={`Repeat: ${repeatMode}`}
                        >
                            <RepeatIcon one={repeatMode === 'one'} />
                        </button>
                    </div>
                </div>

                {/* Right: Volume + Speed */}
                <div className="player-extras">
                    <SpeedControl speed={playbackSpeed} setSpeed={setPlaybackSpeed} />

                    <div className="volume-control">
                        <button className="player-btn" onClick={handleVolumeToggle} title="Mute">
                            {volume === 0 ? <VolumeOffIcon /> : <VolumeOnIcon />}
                        </button>
                        <input
                            type="range" min="0" max="100" value={volume}
                            onChange={e => setVolume(+e.target.value)}
                            className="volume-slider"
                            title={`Volume: ${volume}%`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
