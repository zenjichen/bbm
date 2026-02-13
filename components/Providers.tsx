"use client";

import { PlayerProvider } from "@/context/PlayerContext";
import Player from "@/components/Player";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PlayerProvider>
            {children}
            <Player />
        </PlayerProvider>
    );
}
