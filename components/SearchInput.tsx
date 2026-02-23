"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTracks, DriveTrack } from '@/lib/google-drive';

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const MusicNoteIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z" />
    </svg>
);

interface SuggestionTrack {
    id: string;
    title: string;
    performer: string | null;
}

let cachedTracks: SuggestionTrack[] | null = null;

async function getSuggestionTracks(): Promise<SuggestionTrack[]> {
    if (cachedTracks) return cachedTracks;
    try {
        const { tracks } = await getAllTracks();
        cachedTracks = tracks.map((t: DriveTrack) => ({
            id: t.id,
            title: t.title || t.name,
            performer: t.performer,
        }));
        return cachedTracks;
    } catch {
        return [];
    }
}

export default function SearchInput({ initialQuery = '', compact = false }: { initialQuery?: string; compact?: boolean }) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);
    const [suggestions, setSuggestions] = useState<SuggestionTrack[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [allTracks, setAllTracks] = useState<SuggestionTrack[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Preload tracks khi focus lần đầu
    const preloadTracks = useCallback(async () => {
        if (allTracks.length > 0) return;
        const tracks = await getSuggestionTracks();
        setAllTracks(tracks);
    }, [allTracks.length]);

    // Tính suggestions khi query thay đổi
    useEffect(() => {
        if (!query.trim() || query.trim().length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const q = query.toLowerCase();
        const matches = allTracks
            .filter(t =>
                t.title?.toLowerCase().includes(q) ||
                t.performer?.toLowerCase().includes(q)
            )
            .slice(0, 8);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
        setActiveIndex(-1);
    }, [query, allTracks]);

    // Đóng dropdown khi click ngoài
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearch = (e?: React.FormEvent, override?: string) => {
        e?.preventDefault();
        const q = (override ?? query).trim();
        setShowSuggestions(false);
        router.push(q ? `/?q=${encodeURIComponent(q)}` : '/');
    };

    const handleSuggestionClick = (suggestion: SuggestionTrack) => {
        setQuery(suggestion.title || '');
        setShowSuggestions(false);
        router.push(`/?q=${encodeURIComponent(suggestion.title || '')}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSuggestionClick(suggestions[activeIndex]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setActiveIndex(-1);
        }
    };

    // Highlight matched text
    const highlight = (text: string, q: string) => {
        if (!q) return <span>{text}</span>;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return <span>{text}</span>;
        return (
            <span>
                {text.slice(0, idx)}
                <mark style={{
                    background: 'linear-gradient(90deg, rgba(239,136,187,0.35), rgba(155,63,168,0.25))',
                    color: '#ef88bb',
                    borderRadius: '3px',
                    padding: '0 1px',
                }}>{text.slice(idx, idx + q.length)}</mark>
                {text.slice(idx + q.length)}
            </span>
        );
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <form
                onSubmit={handleSearch}
                className={compact ? 'search-container-compact' : 'search-container'}
                id="search-form"
                autoComplete="off"
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={preloadTracks}
                    onKeyDown={handleKeyDown}
                    placeholder={compact ? "Tìm kiếm..." : "Search tracks, artists..."}
                    className={compact ? 'search-input-compact' : 'search-input'}
                    id="search-input"
                />
                <div className="search-icon"><SearchIcon /></div>
            </form>

            {/* Dropdown gợi ý */}
            {showSuggestions && (
                <div className="search-suggestions-dropdown">
                    {suggestions.map((s, i) => (
                        <button
                            key={s.id}
                            className={`suggestion-item ${i === activeIndex ? 'suggestion-active' : ''}`}
                            onMouseDown={e => { e.preventDefault(); handleSuggestionClick(s); }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <span className="suggestion-icon">
                                <MusicNoteIcon />
                            </span>
                            <span className="suggestion-text">
                                <span className="suggestion-title">{highlight(s.title || '', query)}</span>
                                {s.performer && (
                                    <span className="suggestion-artist">{s.performer}</span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
