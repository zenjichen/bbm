"use client";

import { useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

/**
 * Syncs player state to the <body> element as data attributes.
 * This lets pure CSS drive layout transitions (expand/shrink).
 */
export default function AppStateSync() {
    const { isPlaying, currentTrack } = usePlayer();

    useEffect(() => {
        const body = document.body;
        if (isPlaying && currentTrack) {
            body.setAttribute('data-playing', 'true');
        } else {
            body.removeAttribute('data-playing');
        }
    }, [isPlaying, currentTrack]);

    return null;
}
