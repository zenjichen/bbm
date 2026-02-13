"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({ initialQuery = '' }: { initialQuery?: string }) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/?q=${encodeURIComponent(query)}`);
        } else {
            router.push('/');
        }
    };

    return (
        <form onSubmit={handleSearch} className="mb-6 relative w-full max-w-md mx-auto">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tracks..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full focus:outline-none focus:border-cyan-500 transition-colors text-zinc-200"
            />
            <Search className="absolute left-3 top-2.5 text-zinc-500 w-5 h-5" />
        </form>
    );
}
