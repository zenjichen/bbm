"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

export interface Track {
    id: number;
    file_id: string;
    file_unique_id?: string;
    title: string | null;
    performer: string | null;
    duration: number;
    file_size?: number;
    mime_type?: string;
    topic_id?: number | null;
    message_id?: number;
    chat_id?: string;
    date?: number;
    thumbnail?: string | null;
}

export interface TopicInfo {
    id: number;
    name: string;
}

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextType {
    currentTrack: Track | null;
    playlist: Track[];
    isPlaying: boolean;
    isLoading: boolean;
    progress: number;        // 0-100
    currentTime: number;     // seconds
    totalDuration: number;   // seconds
    volume: number;          // 0-100
    isShuffle: boolean;
    repeatMode: RepeatMode;
    playTrack: (track: Track) => void;
    togglePlay: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    setPlaylist: (tracks: Track[]) => void;
    seekTo: (percent: number) => void;
    setVolume: (vol: number) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
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

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isLoadingRef = useRef(false);

    // Initialize audio element
    useEffect(() => {
        if (typeof window !== "undefined" && !audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.volume = volume / 100;

            audioRef.current.addEventListener('timeupdate', () => {
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / audio.duration) * 100);
            });

            audioRef.current.addEventListener('loadedmetadata', () => {
                const audio = audioRef.current;
                if (audio) {
                    setTotalDuration(audio.duration);
                    setIsLoading(false);
                    isLoadingRef.current = false;
                }
            });

            audioRef.current.addEventListener('canplay', () => {
                setIsLoading(false);
                isLoadingRef.current = false;
            });

            audioRef.current.addEventListener('waiting', () => {
                setIsLoading(true);
                isLoadingRef.current = true;
            });

            audioRef.current.addEventListener('ended', () => {
                handleTrackEnded();
            });

            audioRef.current.addEventListener('error', (e) => {
                console.error("Audio error:", e);
                setIsLoading(false);
                isLoadingRef.current = false;
            });
        }
    }, []);

    const handleTrackEnded = useCallback(() => {
        // This will be called from the 'ended' event
        // We dispatch a custom event to handle it in the effect below
        document.dispatchEvent(new CustomEvent('audio-track-ended'));
    }, []);

    // Handle auto-next on track end
    useEffect(() => {
        const handler = () => {
            if (repeatMode === 'one') {
                // Replay same track
                const audio = audioRef.current;
                if (audio) {
                    audio.currentTime = 0;
                    audio.play().catch(console.error);
                }
                return;
            }

            if (!currentTrack || playlist.length === 0) return;

            const idx = playlist.findIndex(t => t.id === currentTrack.id);

            if (isShuffle) {
                // Random next
                const randomIdx = Math.floor(Math.random() * playlist.length);
                playTrack(playlist[randomIdx]);
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

    // Fetch and play track from Telegram via our proxy API
    useEffect(() => {
        const fetchAndPlay = async () => {
            const audio = audioRef.current;
            if (!audio || !currentTrack) return;

            setIsLoading(true);
            isLoadingRef.current = true;

            try {
                // Use our server-side proxy to avoid exposing bot token
                const streamUrl = `/api/stream/${encodeURIComponent(currentTrack.file_id)}`;
                audio.src = streamUrl;
                await audio.play();
                setIsPlaying(true);
            } catch (error: any) {
                console.error("Play error:", error);
                // If autoplay is blocked, we still set the source
                if (error.name === 'NotAllowedError') {
                    setIsPlaying(false);
                }
            } finally {
                setIsLoading(false);
                isLoadingRef.current = false;
            }
        };

        if (currentTrack) {
            fetchAndPlay();
        }
    }, [currentTrack]);

    // Sync isPlaying state with audio
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack || isLoadingRef.current) return;

        if (isPlaying) {
            audio.play().catch(e => {
                console.error("Play failed:", e);
                setIsPlaying(false);
            });
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    // Sync volume
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = volume / 100;
    }, [volume]);

    const playTrack = (track: Track) => {
        setCurrentTrack(track);
        setIsPlaying(true);
        setProgress(0);
        setCurrentTime(0);
    };

    const togglePlay = () => {
        if (!currentTrack) return;
        setIsPlaying(prev => !prev);
    };

    const nextTrack = () => {
        if (!currentTrack || playlist.length === 0) return;

        if (isShuffle) {
            const randomIdx = Math.floor(Math.random() * playlist.length);
            playTrack(playlist[randomIdx]);
            return;
        }

        const idx = playlist.findIndex(t => t.id === currentTrack.id);
        if (idx < playlist.length - 1) {
            playTrack(playlist[idx + 1]);
        } else if (repeatMode === 'all') {
            playTrack(playlist[0]);
        }
    };

    const prevTrack = () => {
        if (!currentTrack || playlist.length === 0) return;

        // If more than 3 seconds into the track, restart it
        if (currentTime > 3) {
            seekTo(0);
            return;
        }

        const idx = playlist.findIndex(t => t.id === currentTrack.id);
        if (idx > 0) {
            playTrack(playlist[idx - 1]);
        } else if (repeatMode === 'all') {
            playTrack(playlist[playlist.length - 1]);
        }
    };

    const seekTo = (percent: number) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        audio.currentTime = (percent / 100) * audio.duration;
    };

    const setVolume = (vol: number) => {
        setVolumeState(Math.max(0, Math.min(100, vol)));
    };

    const toggleShuffle = () => {
        setIsShuffle(prev => !prev);
    };

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    };

    const setPlaylist = (tracks: Track[]) => {
        setPlaylistState(tracks);
    };

    return (
        <PlayerContext.Provider
            value={{
                currentTrack, playlist, isPlaying, isLoading,
                progress, currentTime, totalDuration, volume,
                isShuffle, repeatMode,
                playTrack, togglePlay, nextTrack, prevTrack,
                setPlaylist, seekTo, setVolume,
                toggleShuffle, toggleRepeat
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) throw new Error("usePlayer must be used within PlayerProvider");
    return context;
}
