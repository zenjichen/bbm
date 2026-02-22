"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

export interface Track {
    id: string | number;
    file_id: string;
    file_unique_id?: string;
    name?: string;
    title: string | null;
    performer: string | null;
    duration: number;
    file_size?: number;
    mime_type?: string;
    topic_id?: string | number | null;
    playlist_id?: string;
    message_id?: number;
    chat_id?: string;
    date?: number;
    thumbnail?: string | null;
    stream_url?: string;
}

export interface TopicInfo { id: number; name: string; }

type RepeatMode = 'off' | 'all' | 'one';
type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

interface PlayerContextType {
    currentTrack: Track | null;
    playlist: Track[];
    isPlaying: boolean;
    isLoading: boolean;
    progress: number;
    currentTime: number;
    totalDuration: number;
    volume: number;
    isShuffle: boolean;
    repeatMode: RepeatMode;
    playbackSpeed: PlaybackSpeed;
    audioRef: React.MutableRefObject<HTMLAudioElement | null>;
    playTrack: (track: Track) => void;
    togglePlay: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    setPlaylist: (tracks: Track[]) => void;
    seekTo: (percent: number) => void;
    setVolume: (vol: number) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    setPlaybackSpeed: (speed: PlaybackSpeed) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [playlist, setPlaylistState] = useState<Track[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [volume, setVolumeState] = useState(80);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
    const [playbackSpeed, setPlaybackSpeedState] = useState<PlaybackSpeed>(1);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isLoadingRef = useRef(false);

    useEffect(() => {
        if (typeof window !== "undefined" && !audioRef.current) {
            audioRef.current = new Audio();
            // NOTE: Do NOT set crossOrigin='anonymous' — Google Drive returns 403
            // when the browser adds Origin header (CORS mode). Audio plays fine
            // in default no-cors mode. Waveform uses CSS animation instead.
            audioRef.current.volume = 0.8;

            audioRef.current.addEventListener('timeupdate', () => {
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / audio.duration) * 100);
            });

            audioRef.current.addEventListener('loadedmetadata', () => {
                const audio = audioRef.current;
                if (audio) { setTotalDuration(audio.duration); setIsLoading(false); isLoadingRef.current = false; }
            });

            audioRef.current.addEventListener('canplay', () => { setIsLoading(false); isLoadingRef.current = false; });
            audioRef.current.addEventListener('waiting', () => { setIsLoading(true); isLoadingRef.current = true; });
            audioRef.current.addEventListener('ended', () => { document.dispatchEvent(new CustomEvent('audio-track-ended')); });
            audioRef.current.addEventListener('error', () => { setIsLoading(false); isLoadingRef.current = false; });
        }
    }, []);

    useEffect(() => {
        const handler = () => {
            if (repeatMode === 'one') {
                const audio = audioRef.current;
                if (audio) { audio.currentTime = 0; audio.play().catch(console.error); }
                return;
            }
            if (!currentTrack || playlist.length === 0) return;
            const idx = playlist.findIndex(t => t.id === currentTrack.id);
            if (isShuffle) {
                playTrack(playlist[Math.floor(Math.random() * playlist.length)]);
            } else if (idx < playlist.length - 1) {
                playTrack(playlist[idx + 1]);
            } else if (repeatMode === 'all') {
                playTrack(playlist[0]);
            } else {
                setIsPlaying(false);
            }
        };
        document.addEventListener('audio-track-ended', handler);
        return () => document.removeEventListener('audio-track-ended', handler);
    }, [currentTrack, playlist, isShuffle, repeatMode]);

    useEffect(() => {
        let cancelled = false;

        const tryPlay = async (audio: HTMLAudioElement, url: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                const onCanPlay = async () => {
                    try {
                        audio.playbackRate = playbackSpeed;
                        // On some mobiles, we need to call play() directly after load
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            await playPromise;
                        }
                        cleanup();
                        resolve();
                    } catch (e) {
                        cleanup();
                        reject(e);
                    }
                };

                const onError = () => {
                    const err = audio.error;
                    const msg = err ? `Audio Error ${err.code}: ${err.message}` : "Network or CORS Error";
                    cleanup();
                    reject(new Error(msg));
                };

                const cleanup = () => {
                    audio.removeEventListener('canplay', onCanPlay);
                    audio.removeEventListener('error', onError);
                    audio.removeEventListener('stalled', onError);
                };

                audio.addEventListener('canplay', onCanPlay);
                audio.addEventListener('error', onError);
                audio.addEventListener('stalled', onError);

                // Reset and Load
                audio.pause();
                audio.removeAttribute('src');
                audio.load();
                audio.src = url;
                audio.load();
            });
        };


        const fetchAndPlay = async () => {
            const audio = audioRef.current;
            if (!audio || !currentTrack) return;
            setIsLoading(true);
            isLoadingRef.current = true;

            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
            const fileId = currentTrack.file_id || String(currentTrack.id);

            // Primary URL: Drive API v3 (correct for API-key auth)
            const primaryUrl = currentTrack.stream_url ||
                `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${apiKey}`;

            // Fallback 1: UC Export (Open)
            const fallback1 = `https://drive.google.com/uc?export=open&id=${encodeURIComponent(fileId)}`;

            // Fallback 2: UC Export (Download) - often bypasses some restrictions
            const fallback2 = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

            // Fallback 3: Docs UC
            const fallback3 = `https://docs.google.com/uc?id=${encodeURIComponent(fileId)}&export=download`;

            const urls = [primaryUrl, fallback1, fallback2, fallback3];

            for (const url of urls) {
                if (cancelled) break;
                try {
                    await tryPlay(audio, url);
                    if (!cancelled) {
                        setIsPlaying(true);
                        return; // Success!
                    }
                } catch (err: any) {
                    if (cancelled || err.name === 'AbortError') return;
                    console.warn(`[Player] URL failed: ${url.substring(0, 40)}... - Reason: ${err.message || err.name}`);
                    // Continue to next URL
                }
            }

            // If we're here, all failed
            if (!cancelled) {
                console.error("[Player] All Google Drive URL fallbacks failed for track:", currentTrack.title);
                setIsPlaying(false);
                setIsLoading(false);
                isLoadingRef.current = false;
            }
        };

        if (currentTrack) fetchAndPlay();
        return () => { cancelled = true; };
    }, [currentTrack]);



    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack || isLoadingRef.current) return;
        if (isPlaying) { audio.play().catch(e => { if (e.name !== 'AbortError') setIsPlaying(false); }); }
        else { audio.pause(); }
    }, [isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = volume / 100;
    }, [volume]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.playbackRate = playbackSpeed;
    }, [playbackSpeed]);

    const playTrack = (track: Track) => {
        // Unlock audio for mobile browsers immediately on user gesture
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
            }).catch(() => {
                // If play() fails here it's okay, we're just unlocking/pre-warming
                audioRef.current?.load();
            });
        }
        setCurrentTrack(track); setIsPlaying(true); setProgress(0); setCurrentTime(0);
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true))
                .catch(err => {
                    console.error("[Player] TogglePlay failed:", err);
                    // Force a reload if it's a structural error
                    if (audio.error) {
                        const fileId = currentTrack.file_id || String(currentTrack.id);
                        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
                        const url = currentTrack.stream_url || `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${apiKey}`;
                        audio.src = url;
                        audio.load();
                        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                    }
                });
        }
    };
    const nextTrack = () => {
        if (!currentTrack || playlist.length === 0) return;
        if (isShuffle) { playTrack(playlist[Math.floor(Math.random() * playlist.length)]); return; }
        const idx = playlist.findIndex(t => t.id === currentTrack.id);
        if (idx < playlist.length - 1) playTrack(playlist[idx + 1]);
        else if (repeatMode === 'all') playTrack(playlist[0]);
    };
    const prevTrack = () => {
        if (!currentTrack || playlist.length === 0) return;
        if (currentTime > 3) { seekTo(0); return; }
        const idx = playlist.findIndex(t => t.id === currentTrack.id);
        if (idx > 0) playTrack(playlist[idx - 1]);
        else if (repeatMode === 'all') playTrack(playlist[playlist.length - 1]);
    };
    const seekTo = (percent: number) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        audio.currentTime = (percent / 100) * audio.duration;
    };
    const setVolume = (vol: number) => setVolumeState(Math.max(0, Math.min(100, vol)));
    const toggleShuffle = () => setIsShuffle(prev => !prev);
    const toggleRepeat = () => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
    const setPlaybackSpeed = (speed: PlaybackSpeed) => setPlaybackSpeedState(speed);
    const setPlaylist = (tracks: Track[]) => setPlaylistState(tracks);

    return (
        <PlayerContext.Provider value={{
            currentTrack, playlist, isPlaying, isLoading,
            progress, currentTime, totalDuration, volume,
            isShuffle, repeatMode, playbackSpeed, audioRef,
            playTrack, togglePlay, nextTrack, prevTrack,
            setPlaylist, seekTo, setVolume,
            toggleShuffle, toggleRepeat, setPlaybackSpeed,
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) throw new Error("usePlayer must be used within PlayerProvider");
    return context;
}
