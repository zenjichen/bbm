"use client";

import { PlayerProvider } from "@/context/PlayerContext";
import Player from "@/components/Player";
import AppStateSync from "@/components/AppStateSync";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PlayerProvider>
            <AppStateSync />
            {children}
            <Player />
        </PlayerProvider>
    );
}
