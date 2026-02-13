"use client";

import React, { useRef, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

export default function Player() {
    const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack } = usePlayer();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // We already handle audio via context, but maybe we need a progress bar?
        // Actually, `PlayerContext` handled audio logic via `useEffect`.
        // Wait, in `PlayerContext`, I implemented `audioRef` inside `useEffect`, but kept it in `useRef` closure.
        // The `Player` component here is just UI + controls.
        // So the actual stream URL is managed by `PlayerContext`.
    }, []);

    if (!currentTrack) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-white/10 p-4 h-24 flex items-center justify-between z-50">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center shrink-0">
                    🎵
                </div>
                <div className="truncate">
                    <h3 className="font-semibold truncate">{currentTrack.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{currentTrack.performer}</p>
                </div>
            </div>

            <div className="flex flex-col items-center flex-1 max-w-md">
                <div className="flex items-center gap-6">
                    <button onClick={prevTrack} className="hover:text-white text-gray-400 transition">
                        <SkipBack size={24} />
                    </button>

                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>

                    <button onClick={nextTrack} className="hover:text-white text-gray-400 transition">
                        <SkipForward size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 hidden md:flex justify-end text-right">
                {/* Volume controls could go here */}
            </div>
        </div>
    );
}
