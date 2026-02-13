"use client";

import React from "react";
import { usePlayer, Track } from "@/context/PlayerContext";
import { Play, Pause } from "lucide-react";

interface TrackItemProps {
    track: Track;
    playlistContext: Track[];
}

export default function TrackItem({ track, playlistContext }: TrackItemProps) {
    const { playTrack, currentTrack, isPlaying, setPlaylist, togglePlay } = usePlayer();

    const isCurrent = currentTrack?.id === track.id;

    const handlePlay = () => {
        if (isCurrent) {
            togglePlay();
        } else {
            setPlaylist(playlistContext);
            playTrack(track);
        }
    };

    return (
        <div
            onClick={handlePlay}
            className={`flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition cursor-pointer group ${isCurrent ? 'bg-zinc-800/50' : ''}`}
        >
            <div className="w-10 h-10 bg-zinc-700 rounded-md flex items-center justify-center shrink-0">
                {isCurrent && isPlaying ? (
                    <Pause size={16} className="text-cyan-400" />
                ) : (
                    <Play size={16} className="text-zinc-400 group-hover:text-white transition" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <h4 className={`font-medium truncate ${isCurrent ? 'text-cyan-400' : 'text-zinc-200'}`}>
                    {track.title || "Unknown Title"}
                </h4>
                <p className="text-sm text-zinc-500 truncate">
                    {track.performer || "Unknown Artist"}
                </p>
            </div>
            <div className="text-xs text-zinc-600">
                {formatDuration(track.duration)}
            </div>
        </div>
    );
}

function formatDuration(seconds: number) {
    if (!seconds) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
}
