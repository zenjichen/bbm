"use client";

import Link from "next/link";
import { Folder } from "lucide-react";

interface TopicGridProps {
    topics: { id: number, name: string }[];
}

export default function TopicGrid({ topics }: TopicGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {topics.map(topic => (
                <Link
                    key={topic.id}
                    href={`/?topic=${topic.id}`}
                    className="group bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center gap-4 hover:border-cyan-500 hover:bg-zinc-800 transition shadow-sm hover:shadow-cyan-500/20"
                >
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition">
                        <Folder className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-center text-zinc-100 group-hover:text-cyan-400 transition">
                        {topic.name || `Topic ${topic.id}`}
                    </h3>
                </Link>
            ))}
        </div>
    );
}
