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
        let blobUrl: string | null = null;
        let abortCtrl: AbortController | null = null;

        /**
         * Thử phát nhạc qua fetch → Blob URL.
         * Nếu fetch thành công (proxy API hoặc CORS-friendly URL), tạo Blob URL.
         */
        const tryFetchBlob = async (
            audio: HTMLAudioElement,
            url: string,
            label: string
        ): Promise<boolean> => {
            if (cancelled) return false;
            console.log(`[Player] Đang thử (fetch): ${label}`);

            abortCtrl = new AbortController();
            const response = await fetch(url, { signal: abortCtrl.signal });
            if (cancelled) return false;

            if (!response.ok) {
                console.warn(`[Player] ${label}: HTTP ${response.status}`);
                return false;
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                console.warn(`[Player] ${label}: Nhận HTML (virus scan page) → bỏ qua`);
                return false;
            }

            const blob = await response.blob();
            if (cancelled) return false;

            if (blob.size < 1000) {
                const text = await blob.text();
                if (text.includes('<html') || text.includes('<!DOCTYPE')) {
                    console.warn(`[Player] ${label}: Response chứa HTML → bỏ qua`);
                    return false;
                }
            }

            if (blobUrl) URL.revokeObjectURL(blobUrl);
            const audioBlob = new Blob([blob], {
                type: contentType.includes('audio') ? contentType : 'audio/mpeg',
            });
            blobUrl = URL.createObjectURL(audioBlob);

            audio.crossOrigin = null;
            audio.src = blobUrl;
            audio.load();

            await new Promise<void>((resolve, reject) => {
                const onCanPlay = () => { audio.removeEventListener('canplay', onCanPlay); audio.removeEventListener('error', onErr); resolve(); };
                const onErr = () => { audio.removeEventListener('canplay', onCanPlay); audio.removeEventListener('error', onErr); reject(new Error(audio.error?.message || 'Audio load error')); };
                audio.addEventListener('canplay', onCanPlay);
                audio.addEventListener('error', onErr);
            });

            return true;
        };

        /**
         * Thử phát nhạc bằng cách gán URL trực tiếp vào audio.src.
         * Cách này không bị CORS vì audio element dùng no-cors mode.
         */
        const tryDirectSrc = async (
            audio: HTMLAudioElement,
            url: string,
            label: string,
            timeoutMs = 15000
        ): Promise<boolean> => {
            if (cancelled) return false;
            console.log(`[Player] Đang thử (direct): ${label}`);

            audio.crossOrigin = null;
            audio.src = url;
            audio.load();

            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => {
                    audio.removeEventListener('canplay', onCanPlay);
                    audio.removeEventListener('error', onErr);
                    reject(new Error('Timeout'));
                }, timeoutMs);
                const onCanPlay = () => { clearTimeout(timer); audio.removeEventListener('canplay', onCanPlay); audio.removeEventListener('error', onErr); resolve(); };
                const onErr = () => { clearTimeout(timer); audio.removeEventListener('canplay', onCanPlay); audio.removeEventListener('error', onErr); reject(new Error(audio.error?.message || 'Format error')); };
                audio.addEventListener('canplay', onCanPlay);
                audio.addEventListener('error', onErr);
            });

            return true;
        };

        const fetchAndPlay = async () => {
            const audio = audioRef.current;
            if (!audio || !currentTrack) return;
            setIsLoading(true);
            isLoadingRef.current = true;

            const fileId = currentTrack.file_id || String(currentTrack.id);
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
            // NEXT_PUBLIC_VERCEL_API_URL: URL tuyệt đối của Vercel deployment
            // Dùng khi app chạy trên GitHub Pages nhưng cần gọi API proxy của Vercel
            // Ví dụ: https://bbm-zenjichens-projects.vercel.app
            const vercelApiUrl = process.env.NEXT_PUBLIC_VERCEL_API_URL || '';

            /**
             * CHIẾN LƯỢC PHÁT NHẠC (theo thứ tự ưu tiên):
             *
             * 0. Kiểm tra API Proxy có hoạt động không (HEAD request nhanh)
             *    - Nếu có NEXT_PUBLIC_VERCEL_API_URL → dùng URL tuyệt đối đó
             *    - Nếu không → thử relative (chỉ hoạt động khi chạy trên Vercel)
             *
             * 1. API Proxy (cross-origin fetch to Vercel)
             *    - Hoạt động cả khi app chạy trên GitHub Pages
             *    - Vercel server fetch từ Google Drive → không bị CORS, không virus scan
             *
             * 2. Direct audio.src với Google API URL + acknowledgeAbuse=true
             *    - Fallback nếu không có Vercel proxy
             *
             * 3-4. UC URL fallbacks
             */

            // ── Xây dựng URL proxy ──
            // - proxyBase có giá trị: gọi Vercel cross-origin (GitHub Pages → Vercel)
            //   không dùng basePath vì Vercel deploy ở root (/api/stream), không có /bbm prefix
            // - proxyBase rỗng: gọi same-origin (chạy trên Vercel) → dùng basePath bình thường
            const proxyBase = vercelApiUrl || '';
            const proxyCheckUrl = proxyBase
                ? `${proxyBase}/api/stream?id=ping_check`
                : `${basePath}/api/stream?id=ping_check`;

            // ── Kiểm tra nhanh: API Proxy có tồn tại không? ──
            let proxyAvailable = false;
            try {
                const headRes = await fetch(proxyCheckUrl, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(4000),
                    // Cho phép cross-origin nếu đang gọi Vercel từ GitHub Pages
                    mode: proxyBase ? 'cors' : 'same-origin',
                });
                // 400 = server có (missing actual file id) → proxy OK
                // 404 = không có server (GitHub Pages static)
                // 401 = Vercel password protected → coi như có proxy nhưng không dùng được
                proxyAvailable = headRes.status !== 404 && headRes.status !== 401;
                console.log(`[Player] API Proxy check: HTTP ${headRes.status} → ${proxyAvailable ? '✓ Proxy hoạt động' : '✗ Bỏ qua proxy'}`);
            } catch (_) {
                proxyAvailable = false;
                console.log('[Player] API Proxy check: timeout/lỗi → bỏ qua proxy');
            }

            const strategies: Array<{ fn: () => Promise<boolean>; label: string }> = [];

            // ── Chiến lược 1: API Proxy (chỉ thử nếu server tồn tại và không bị block) ──
            if (proxyAvailable) {
                // Cross-origin Vercel: chỉ dùng proxyBase (không có /bbm)
                // Same-origin Vercel: dùng basePath
                const proxyStreamUrl = proxyBase
                    ? `${proxyBase}/api/stream?id=${encodeURIComponent(fileId)}`
                    : `${basePath}/api/stream?id=${encodeURIComponent(fileId)}`;
                strategies.push({
                    label: 'API Proxy',
                    fn: () => tryFetchBlob(
                        audio,
                        proxyStreamUrl,
                        `API Proxy (${proxyBase ? 'Vercel cross-origin' : 'server-side'})`
                    ),
                });
            }

            // ── Chiến lược 2: Direct Google API URL + acknowledgeAbuse để bypass virus scan ──
            if (apiKey) {
                strategies.push({
                    label: 'Google API Direct',
                    fn: () => tryDirectSrc(
                        audio,
                        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}&acknowledgeAbuse=true`,
                        'Google API (direct audio.src)'
                    ),
                });
            }

            // ── Chiến lược 3: Direct UC URL ──
            strategies.push({
                label: 'Google UC Direct',
                fn: () => tryDirectSrc(
                    audio,
                    `https://drive.google.com/uc?id=${fileId}&export=download&confirm=t&acknowledgeAbuse=true`,
                    'Google UC (direct audio.src)'
                ),
            });

            // ── Chiến lược 4: drive.usercontent.google.com ──
            strategies.push({
                label: 'Google Content Direct',
                fn: () => tryDirectSrc(
                    audio,
                    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`,
                    'Google Content (direct audio.src)'
                ),
            });

            for (const { fn, label } of strategies) {
                if (cancelled) return;
                try {
                    const success = await fn();
                    if (success && !cancelled) {
                        audio.playbackRate = playbackSpeed;
                        await audio.play();
                        setIsPlaying(true);
                        setIsLoading(false);
                        isLoadingRef.current = false;
                        console.log(`[Player] ✓ Phát nhạc thành công qua ${label}!`);
                        return;
                    }
                } catch (e: any) {
                    if (cancelled) return;
                    if (e.name === 'AbortError') return;
                    console.warn(`[Player] ${label} lỗi:`, e.message);
                    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
                }
            }

            if (!cancelled) {
                console.error('[Player] ✗ Không thể phát bài này.');
                console.error('[Player] Gợi ý: Deploy app trên Vercel để dùng API Proxy (giải quyết CORS + virus scan)');
                setIsPlaying(false);
                setIsLoading(false);
                isLoadingRef.current = false;
            }
        };

        if (currentTrack) fetchAndPlay();
        return () => {
            cancelled = true;
            if (abortCtrl) { try { abortCtrl.abort(); } catch (_) { } }
            if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
        };
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
                    // Force a full re-fetch if there's a structural error
                    if (audio.error) {
                        console.log("[Player] Re-triggering fetch flow...");
                        const track = { ...currentTrack };
                        setCurrentTrack(null);
                        setTimeout(() => {
                            setCurrentTrack(track);
                            setIsPlaying(true);
                        }, 100);
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
