"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export default function SearchInput({ initialQuery = '' }: { initialQuery?: string }) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/?q=${encodeURIComponent(query.trim())}`);
        } else {
            router.push('/');
        }
    };

    return (
        <form onSubmit={handleSearch} className="search-container" id="search-form">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tracks, artists..."
                className="search-input"
                id="search-input"
            />
            <div className="search-icon">
                <SearchIcon />
            </div>
        </form>
    );
}
