"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

export interface Track {
    id: number;
    file_id: string;
    title: string | null;
    performer: string | null;
    duration: number;
    topic_id?: number | null;
}

interface PlayerContextType {
    currentTrack: Track | null;
    playlist: Track[];
    isPlaying: boolean;
    playTrack: (track: Track) => void;
    togglePlay: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    setPlaylist: (tracks: Track[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [playlist, setPlaylist] = useState<Track[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);

    // We use a ref for the audio element to persist it across renders without re-creating
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio object only once on client
        if (typeof window !== "undefined" && !audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.addEventListener('ended', () => {
                // We need to access the LATEST state of 'playlist' and 'currentTrack' here.
                // Closure issue: 'nextTrack' inside this listener might see stale state if defined outside.
                // But we can trigger a state update or use refs.
                // For simplicity, we just dispatch a custom event or let the component handle it?
                // Actually, the simplest way is to put 'nextTrack' logic inside a useEffect that depends on 'currentTrack' ending?
                // No. Let's use a function ref.
            });
        }

        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            // We need to call nextTrack(). But 'nextTrack' depends on current state.
            // We can implement nextTrack using functional update? No.
            // Dispatch an event.
            document.dispatchEvent(new CustomEvent('audio-ended'));
        };

        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, []);

    // Listen to custom event for auto-next
    useEffect(() => {
        const handleAutoNext = () => {
            if (currentTrack && playlist.length > 0) {
                const idx = playlist.findIndex(t => t.id === currentTrack.id);
                if (idx !== -1 && idx < playlist.length - 1) {
                    playTrack(playlist[idx + 1]);
                }
            }
        };
        document.addEventListener('audio-ended', handleAutoNext);
        return () => document.removeEventListener('audio-ended', handleAutoNext);
    }, [currentTrack, playlist]);


    // Handle Play/Pause
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.play().catch(e => console.error("Play failed", e));
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    // Handle Track Change
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        const src = `/api/stream/${currentTrack.file_id}`;
        if (audio.src !== window.location.origin + src) {
            audio.src = src;
            audio.play().then(() => setIsPlaying(true)).catch(e => console.error("Play error", e));
        }
    }, [currentTrack]);

    const playTrack = (track: Track) => {
        setCurrentTrack(track);
        setIsPlaying(true);
    };

    const togglePlay = () => {
        if (!currentTrack) return;
        setIsPlaying(!isPlaying);
    };

    const nextTrack = () => {
        if (!currentTrack || playlist.length === 0) return;
        const idx = playlist.findIndex(t => t.id === currentTrack.id);
        if (idx !== -1 && idx < playlist.length - 1) {
            playTrack(playlist[idx + 1]);
        }
    };

    const prevTrack = () => {
        if (!currentTrack || playlist.length === 0) return;
        const idx = playlist.findIndex(t => t.id === currentTrack.id);
        if (idx > 0) {
            playTrack(playlist[idx - 1]);
        }
    };

    return (
        <PlayerContext.Provider
            value={{ currentTrack, playlist, isPlaying, playTrack, togglePlay, nextTrack, prevTrack, setPlaylist }}
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
