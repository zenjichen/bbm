"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export default function SearchInput({ initialQuery = '', compact = false }: { initialQuery?: string; compact?: boolean }) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
    };

    return (
        <form onSubmit={handleSearch} className={compact ? 'search-container-compact' : 'search-container'} id="search-form">
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={compact ? "Tìm kiếm..." : "Search tracks, artists..."}
                className={compact ? 'search-input-compact' : 'search-input'}
                id="search-input"
            />
            <div className="search-icon"><SearchIcon /></div>
        </form>
    );
}
