"use client";

import { useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

function trackThumb(fileId: string): string {
    const seed = (fileId || 'bbmmusic').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'bbmdefault';
    return `https://picsum.photos/seed/${seed}/600/600`;
}

export default function AppStateSync() {
    const { isPlaying, currentTrack } = usePlayer();

    useEffect(() => {
        const body = document.body;
        const bg = document.querySelector('.global-player-bg') as HTMLElement;

        if (isPlaying && currentTrack) {
            body.setAttribute('data-playing', 'true');
            if (bg) {
                bg.style.backgroundImage = `url(${trackThumb(currentTrack.file_id)})`;
                bg.style.opacity = '1';
            }
        } else {
            body.removeAttribute('data-playing');
            if (bg) {
                bg.style.opacity = '0';
            }
        }
    }, [isPlaying, currentTrack]);

    return null;
}
