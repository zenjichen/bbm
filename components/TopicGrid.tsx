"use client";

import Link from "next/link";

interface TopicGridProps {
    topics: { id: number; name: string; trackCount?: number }[];
}

const TOPIC_EMOJIS = ['🎵', '🎸', '🎹', '🎧', '🎤', '🎺', '🎻', '🥁', '🪗', '🎼'];

export default function TopicGrid({ topics }: TopicGridProps) {
    if (topics.length === 0) return null;

    return (
        <div className="playlist-grid stagger-enter">
            {topics.map((topic, index) => (
                <Link
                    key={topic.id}
                    href={`/?topic=${topic.id}`}
                    className="playlist-card"
                    id={`playlist-${topic.id}`}
                >
                    <div className="playlist-cover">
                        {TOPIC_EMOJIS[index % TOPIC_EMOJIS.length]}
                    </div>
                    <div className="playlist-info">
                        <div className="playlist-name">{topic.name}</div>
                        {topic.trackCount !== undefined && (
                            <div className="playlist-count">{topic.trackCount} tracks</div>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
}
